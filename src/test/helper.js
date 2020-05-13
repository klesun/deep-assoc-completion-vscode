
const vscode = require('vscode');
const path = require('path');

/**
 * Activates the vscode.lsp-sample extension
 */
exports.activate = async function(docUri) {
    // The extensionId is `publisher.name` from package.json
    const ext = vscode.extensions.getExtension('klesun.deep-assoc-completion-vscode');
    await ext.activate();
    try {
        const doc = await vscode.workspace.openTextDocument(docUri);
        const editor = await vscode.window.showTextDocument(doc);
        // note, if this delay is too small, there will be no completion,
        // I suspect that I neglect waiting for files initialization before
        // reporting that server is ready...
        // 2165 - too little
        // 2166 - too much
        await sleep(2166); // Wait for server activation
    } catch (e) {
        console.error(e);
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getDocPath = (p) => {
    return path.resolve(__dirname, '../../testFixture', p);
};
exports.getDocUri = (p) => {
    return vscode.Uri.file(getDocPath(p));
};