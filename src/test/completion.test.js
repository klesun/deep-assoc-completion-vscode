const vscode = require('vscode');
const assert = require('assert');
const { getDocUri, activate } = require('./helper.js');

suite('Should do completion', () => {
	const docUri = getDocUri('completion.php');

	test('Completes assoc array keys in php file', async () => {
		await testCompletion(docUri, new vscode.Position(2, 6), {
			items: [
				{ label: 'name', kind: vscode.CompletionItemKind.Field },
				{ label: 'age', kind: vscode.CompletionItemKind.Field },
			]
		});
	});
});

async function testCompletion(docUri, position, expectedCompletionList) {
	await activate(docUri);

	// Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
	const actualCompletionList = (await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider', docUri, position
    ));

	assert.ok(actualCompletionList.items.length >= 2);
	expectedCompletionList.items.forEach((expectedItem, i) => {
		const actualItem = actualCompletionList.items[i];
		assert.equal(actualItem.label, expectedItem.label);
		assert.equal(actualItem.kind, expectedItem.kind);
	});
}
