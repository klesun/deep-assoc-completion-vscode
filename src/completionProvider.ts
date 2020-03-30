import * as vscode from 'vscode';

export function completionProvider () {
    // simple completion that suggests 'log/error' if user types 'console.'
	return vscode.languages.registerCompletionItemProvider(
		{ scheme: 'file', language: 'php' }, // document selector
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const linePrefix = document.lineAt(position).text.substr(0, position.character);

				if (!linePrefix.endsWith('console.'))
					return undefined;

				return [
					new vscode.CompletionItem('log', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('error', vscode.CompletionItemKind.Method),
				];
			},
		},
		'.' // triggers on
	);
}