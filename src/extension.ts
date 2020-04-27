import * as vscode from 'vscode';
import { workspace, ExtensionContext } from 'vscode';
import { completionProvider } from './completionProvider';
import * as path from 'path';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

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
				execArgv: ['--inspect=6009']
			},
		},
	};
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'php' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/*.php'),
		},
	};
	client = new LanguageClient(
		'deep-assoc-completion-vscode',
		'deep-assoc-completion-vscode',
		serverOptions,
		clientOptions
	);
	client.start();
	client.onReady();
};

export function activate(context: ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		vscode.window.showInformationMessage('deep-assoc-completion-vscode loaded!');
	});
	const completion = completionProvider();
	context.subscriptions.push(disposable, completion);

	setupLangServer(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (client) {
		client.stop();
	}
}
