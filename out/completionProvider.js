"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function completionProvider() {
    // simple completion that suggests 'log/error' if user types 'console.'
    return vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'php' }, // document selector
    {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            if (!linePrefix.endsWith('console.'))
                return undefined;
            return [
                new vscode.CompletionItem('log', vscode.CompletionItemKind.Method),
                new vscode.CompletionItem('error', vscode.CompletionItemKind.Method),
            ];
        },
    }, '.' // triggers on
    );
}
exports.completionProvider = completionProvider;
//# sourceMappingURL=completionProvider.js.map