import { workspace, ExtensionContext } from 'vscode';
import * as path from 'path';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import SubscribeForIndexing from './SubscribeForIndexing';

let client: LanguageClient;

const setupLangServer = (context: ExtensionContext) => {
	const scriptPath = path.join('node_modules', 'deep-assoc-lang-server', 'src', 'main.js');
	const runOptions = {
		module: context.asAbsolutePath(scriptPath),
		transport: TransportKind.ipc,
		// for es6 imports in js files
		args: ['--experimental-modules'],
	};
	const serverOptions: ServerOptions = {
		run: runOptions,
		debug: {...runOptions,
			options: {
				// --inspect=6009: runs the server in Node's Inspector mode
				// so VS Code can attach to the server for debugging
				execArgv: ['--nolazy', '--inspect=6009']
			},
		},
	};
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'php' }],
		synchronize: {
			// Notify the server about file changes to php files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/*.php'),
		},
	};
	client = new LanguageClient(
		'deep-assoc-completion-vscode',
		'deep-assoc-completion-vscode',
		serverOptions,
		clientOptions
	);
	const langClientDisposable = client.start();
	context.subscriptions.push(langClientDisposable);

	const indexingDisposables = SubscribeForIndexing({
		languageClient: client, extensionContext: context,
	});
	context.subscriptions.push(...indexingDisposables);

	return client.onReady();
};

export function activate(context: ExtensionContext) {
	// leaving this setting at default value `true` would've caused global keywords
	// being suggested _everywhere_ including when caret is between quotes of array key
	workspace.getConfiguration().update('php.suggest.basic', false);

	return setupLangServer(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (client) {
		client.stop();
	}
}
