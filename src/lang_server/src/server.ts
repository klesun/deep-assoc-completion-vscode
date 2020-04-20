
import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver';

import { Intelephense } from 'intelephense';
import Log from './Log';
import AssocKeyPvdr from './entry/AssocKeyPvdr';

type Connection = ReturnType<typeof createConnection>;

const addIntelephenseListeners = async (connection: Connection) => {
	await Intelephense.initialise({
		storagePath: '/tmp',
		logWriter: {
			info: connection.console.info,
			warn: connection.console.warn,
			error: connection.console.error
		},
		clearCache: true,
	});

	connection.onDidOpenTextDocument((params) => {
		const length = params.textDocument.text.length;
		const maxLength = 300 * 1024;
		if (length > maxLength) {
			connection.console.warn(`${params.textDocument.uri} not opened -- ${length} over max file size of ${maxLength} chars.`);
			return;
		}
		Intelephense.openDocument(params.textDocument);
	});

	connection.onDidChangeTextDocument((params) => {
		Intelephense.editDocument(params.textDocument, params.contentChanges);
	});

	connection.onDidCloseTextDocument((params) => {
		Intelephense.closeDocument(params.textDocument);
	});

	connection.onShutdown(Intelephense.shutdown);

	connection.onCompletion(
		async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
			const intelOptions = await Promise.resolve()
				.then(() => Intelephense.provideCompletions(params.textDocument, params.position))
				.catch(exc => {
					Log.info('ololo exc - ' + exc.stack);
					return Promise.reject(exc);
				});
			const options = await AssocKeyPvdr({
				...Intelephense.getApiTools(),
				uri: params.textDocument.uri,
				position: params.position,
			}).catch(exc => {
				Log.info({message: exc.message, stack: exc.stack});
				return Promise.reject(exc);
			});
			await Log.info({msg: 'pidor guzno', intelOptions, ololo: Intelephense.getApiTools().documentStore + ''});
			return [
				{label: 'Ololo Optionn', kind: CompletionItemKind.Text, data: 1},
				{label: 'Guzno Option', kind: CompletionItemKind.Text, data: 2},
				...options,
			];
		}
	);
};

const main = () => {
	const connection = createConnection(ProposedFeatures.all);

	connection.onInitialize(async (params: InitializeParams) => {
		await addIntelephenseListeners(connection);

		const capabilities = params.capabilities;
		const hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);

		const result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				// Tell the client that the server supports code completion
				completionProvider: {
				}
			}
		};
		if (hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}
		return result;
	});

	connection.listen();
};

main();

process.addListener('message', Log.info);
process.addListener('multipleResolves', Log.info);
process.addListener(<any>'uncaughtException', Log.info);
process.addListener(<any>'unhandledRejection', Log.info);
process.addListener(<any>'warning', Log.info);