
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
import ApiCtx from './contexts/ApiCtx';

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
		(params: TextDocumentPositionParams): CompletionItem[] => {
			const apiTools = Intelephense.getApiTools();
			const apiCtx = ApiCtx({apiTools});
			return apiCtx.getPsiAt({
				uri: params.textDocument.uri,
				position: params.position,
			}).flatMap(psi => AssocKeyPvdr({apiCtx, psi}));
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