
/**
 * @mnodule - mostly copypasted from intelephense
 */

import * as fs from 'fs-extra';
import { LanguageClient, TextDocumentItem } from "vscode-languageclient";
import { Uri, CancellationToken } from "vscode";

const discoverSymbolsRequestName = 'discoverSymbols';
const forgetRequestName = 'forget';
const knownDocumentsRequestName = 'knownDocuments';
const phpLanguageId = 'php';

const WorkspaceDiscovery = ({client, maxFileSizeBytes}: {
    client: LanguageClient,
    maxFileSizeBytes: number,
}) => {
    const delayedDiscoverDebounceTime = 500;
    let delayedDiscoverUriArray: Uri[] = [];
    let delayedDiscoverTimer: NodeJS.Timer | undefined;

    function modTime(uri:Uri):Promise<[Uri, number]> {

        return fs.stat(uri.fsPath).then((stats: any) => {
            return <[Uri, number]>[uri, stats.mtime.getTime()];
        }).catch((err: Error | any) => {
            if(err && err.message) {
                client.warn(err.message);
            }
            return <[Uri, number]>[uri, 0];
        });
    }

    function filterKnownByModtime(knownUriArray: Uri[], timestamp: number) {

        return new Promise<Uri[]>((resolve, reject) => {

            if (!timestamp || knownUriArray.length < 1) {
                resolve(knownUriArray);
            }

            let filtered:Uri[] = [];

            let onResolved = (result:[Uri, number]) => {
                if(result[1] > timestamp) {
                    //was modified since last shutdown
                    filtered.push(result[0]);
                }
                --count;
                if(count < 1) {
                    resolve(filtered);
                } else {
                    let uri = knownUriArray.pop();
                    if(uri){
                        modTime(uri).then(onResolved);
                    }
                }
            }

            let count = knownUriArray.length;
            knownUriArray = knownUriArray.slice(0);
            let batchSize = Math.min(4, count);
            let uri: Uri | undefined;

            while(batchSize-- > 0 && (uri = knownUriArray.pop())) {
                modTime(uri).then(onResolved);
            }

        });

    }

    function forgetMany(uriArray: (Uri | string)[]) {

        return new Promise<void>((resolve, reject) => {

            if (uriArray.length < 1) {
                resolve();
            }

            uriArray = uriArray.slice(0);
            let count = uriArray.length;
            let batchSize = Math.min(4, count);

            let onFulfilled = () => {
                --count;
                if (count < 1) {
                    resolve();
                } else {
                    let uri = uriArray.pop();
                    if (uri) {
                        forgetRequest(uri).then(onFulfilled, onFailed);
                    }
                }
            }

            let onFailed = (msg: string) => {
                client.warn(msg);
                onFulfilled();
            }

            let uri: Uri | string | undefined;
            while (batchSize-- > 0 && (uri = uriArray.pop())) {
                forgetRequest(uri).then(onFulfilled, onFailed);
            }

        });

    }

    function discoverSymbols(uri: Uri) {
        return readTextDocumentItem(uri).then(discoverSymbolsRequest);
    }

    function discoverSymbolsMany(uriArray: Uri[], token?:CancellationToken) {
        return discoverMany(discoverSymbols, uriArray, token);
    }

    function discoverMany(discoverFn: (uri: Uri, token?:CancellationToken) => Promise<number>, uriArray: Uri[], token?:CancellationToken) {

        if(uriArray.length < 1 || (token && token.isCancellationRequested)) {
            return Promise.resolve<number>(0);
        }

        return new Promise<number>((resolve, reject) => {
            let remaining = uriArray.length;
            let items = uriArray.slice(0);
            let item: Uri | undefined;
            let maxOpenFiles = 8;
            let cancelled = false;

            let onAlways = () => {
                --remaining;
                let uri: Uri | undefined;

                if(cancelled) {
                    return;
                } else if (remaining < 1 || (token && token.isCancellationRequested && !cancelled)) {
                    if(token && token.isCancellationRequested) {
                        cancelled = true;
                    }
                    resolve(uriArray.length);
                } else if (uri = items.pop()) {
                    discoverFn(uri, token).then(onResolve).catch(onReject);
                }
            }

            let onResolve = (n: number) => {
                onAlways();
            };

            let onReject = (errMsg: string) => {
                client.warn(errMsg);
                onAlways();
            };

            while (maxOpenFiles > 0 && (item = items.pop())) {
                discoverFn(item, token).then(onResolve).catch(onReject);
                --maxOpenFiles;
            }
        });

    }

    function readTextDocumentItem(uri: Uri) {

        return new Promise<TextDocumentItem>((resolve, reject) => {

            fs.readFile(uri.fsPath, (readErr: Error | null, data: object) => {

                if (readErr) {
                    reject(readErr.message);
                    return;
                }

                let doc: TextDocumentItem = {
                    uri: uri.toString(),
                    text: data.toString(),
                    languageId: phpLanguageId,
                    version: 0
                }

                if (doc.text.length > maxFileSizeBytes) {
                    reject(`${uri} exceeds maximum file size.`);
                    return;
                }

                resolve(doc);

            });
        });

    }

    function forgetRequest(uri: Uri | string) {
        return client.sendRequest<void>(
            forgetRequestName,
            { uri: uri.toString() }
        );
    }

    function discoverSymbolsRequest(doc: TextDocumentItem) {
        return client.sendRequest<number>(
            discoverSymbolsRequestName,
            { textDocument: doc }
        );
    }

    function knownDocumentsRequest(token:CancellationToken) {
        return client.sendRequest<{timestamp:number, documents:string[]}>(
            knownDocumentsRequestName,
            token
        );
    }

    function discover(uriArray: Uri[], token?:CancellationToken) {
        return discoverSymbolsMany(uriArray, token);
    };

    function checkCacheThenDiscover(uriArray: Uri[], checkModTime:boolean, token:CancellationToken) {
        return knownDocumentsRequest(token).then((status) => {

            if (token.isCancellationRequested) {
                return Promise.resolve(0);
            }

            let timestamp = status.timestamp;
            let cachedUriSet = new Set<string>(status.documents);
            let notKnown: Uri[] = [];
            let known: Uri[] = [];
            let uri: Uri;
            let uriString: string;

            for (let n = 0, l = uriArray.length; n < l; ++n) {
                uri = uriArray[n];
                uriString = uri.toString();
                if (cachedUriSet.has(uriString)) {
                    known.push(uri);
                    cachedUriSet.delete(uriString);
                } else {
                    notKnown.push(uri);
                }
            }

            return forgetMany(Array.from(cachedUriSet)).then(() => {
                return checkModTime && !token.isCancellationRequested ? filterKnownByModtime(known, timestamp) : Promise.resolve([]);
            }).then((filteredUriArray)=>{
                Array.prototype.push.apply(notKnown, filteredUriArray);
                return discover(notKnown, token);
            });

        });
    }

    function delayedDiscoverFlush() {
        if (!delayedDiscoverTimer) {
            return;
        }
        clearTimeout(delayedDiscoverTimer);
        delayedDiscoverTimer = undefined;
        discover(delayedDiscoverUriArray);
        delayedDiscoverUriArray = [];
    };

    return {
        checkCacheThenDiscover: checkCacheThenDiscover,
        discover: discover,
        delayedDiscover: (uri: Uri) => (uri: Uri) => {
            if (delayedDiscoverTimer) {
                clearTimeout(delayedDiscoverTimer);
                delayedDiscoverTimer = undefined;
            }
            if (delayedDiscoverUriArray.indexOf(uri) < 0) {
                delayedDiscoverUriArray.push(uri);
            }
            delayedDiscoverTimer = setTimeout(delayedDiscoverFlush, delayedDiscoverDebounceTime);
        },
        delayedDiscoverFlush: delayedDiscoverFlush,
        forget: forgetRequest,
    };
};

export default WorkspaceDiscovery;