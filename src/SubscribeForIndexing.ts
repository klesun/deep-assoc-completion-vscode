
import { workspace, commands, CancellationToken, window, Uri, ExtensionContext } from 'vscode';
import { LanguageClient, CancellationTokenSource } from 'vscode-languageclient';
import WorkspaceDiscovery from './WorkspaceDiscovery';

/**
 * @module - mostly copypasted from vscode
 */

const phpLanguageId = 'php';

function workspaceFilesIncludeGlob() {
	let settings: any = workspace.getConfiguration('files').get('associations');
	let associations = Object.keys(settings).filter((x) => {
		return settings[x] === phpLanguageId;
	});

	associations.push('*.php');
	associations = associations.map((v, i, a) => {
		if(v.indexOf('/') < 0 && v.indexOf('\\') < 0) {
			return '**/' + v;
		} else {
			return v;
		}
	});

	return '{' + Array.from(new Set<string>(associations)).join(',') + '}';
}

const SubscribeForIndexing = ({languageClient, extensionContext}: {
	languageClient: LanguageClient,
	extensionContext: ExtensionContext,
}): { dispose(): any }[] => {
	const workspaceDiscovery = WorkspaceDiscovery({
		client: languageClient,
		maxFileSizeBytes: 256 * 1024,
	});

	function indexingCompleteFeedback(startHrtime: [number, number], fileCount: number, token:CancellationToken) {
		let elapsed = process.hrtime(startHrtime);
		let info = [
			`${fileCount} files`,
			`${elapsed[0]}.${Math.round(elapsed[1] / 1000000)} s`
		];

		languageClient.info(
			[token.isCancellationRequested ? 'Indexing cancelled' : 'Indexing ended', ...info].join(' | ')
		);

		window.setStatusBarMessage([
			'$(search) deep-assoc indexing ' + (token.isCancellationRequested ? 'cancelled' : 'complete'),
			`$(file-code) ${fileCount}`,
			`$(clock) ${elapsed[0]}.${Math.round(elapsed[1] / 100000000)}`
		].join('   '), 30000);
	}

	function indexWorkspace(uriArray: Uri[], checkModTime:boolean, token:CancellationToken) {
		if (token.isCancellationRequested) {
			return;
		}
		let indexingStartHrtime = process.hrtime();
		languageClient.info('Indexing started.');
		let completedPromise = workspaceDiscovery.checkCacheThenDiscover(uriArray, checkModTime, token).then((count) => {
			const msg = '$(search) deep-assoc indexing done: ' + count;
			window.setStatusBarMessage(msg);
			console.debug(msg);
			indexingCompleteFeedback(indexingStartHrtime, count, token);
		}).catch(exc => {
			window.setStatusBarMessage('deep-assoc index exc', exc);
			console.error('deep-assoc index exc', exc);
			return Promise.reject(exc);
		});
		window.setStatusBarMessage('$(search) deep-assoc indexing ...', completedPromise);
	}

	let fsWatcher = workspace.createFileSystemWatcher(workspaceFilesIncludeGlob());
	fsWatcher.onDidDelete(workspaceDiscovery.forget);
	fsWatcher.onDidCreate(workspaceDiscovery.delayedDiscover);
	fsWatcher.onDidChange(workspaceDiscovery.delayedDiscover);

	let cancelWorkspaceDiscoveryController: CancellationTokenSource | undefined;

	if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
		let token:CancellationToken;
		languageClient.onReady().then(() => {
			if (cancelWorkspaceDiscoveryController) {
				cancelWorkspaceDiscoveryController.dispose();
			}
			cancelWorkspaceDiscoveryController = new CancellationTokenSource();
			token = cancelWorkspaceDiscoveryController.token;
			return workspace.findFiles(workspaceFilesIncludeGlob(), undefined, undefined, token);
		}).then((uriArray) => {
			indexWorkspace(uriArray, true, token);
		});
	}

	let onDidChangeWorkspaceFoldersDisposable = workspace.onDidChangeWorkspaceFolders((e)=>{
		//handle folder add/remove
		if (cancelWorkspaceDiscoveryController) {
			cancelWorkspaceDiscoveryController.dispose();
		}
		cancelWorkspaceDiscoveryController = new CancellationTokenSource();
		let token = cancelWorkspaceDiscoveryController.token;
		return workspace.findFiles(workspaceFilesIncludeGlob()).then((uriArray) => {
			indexWorkspace(uriArray, false, token);
		});
	});

	return [
		fsWatcher, onDidChangeWorkspaceFoldersDisposable,
	];
};

export default SubscribeForIndexing;