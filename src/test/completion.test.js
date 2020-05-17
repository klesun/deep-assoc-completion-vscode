const vscode = require('vscode');
const assert = require('assert');
const { getDocUri, activate } = require('./helper.js');
const fs = require('fs');

const parseTestCases = (fileText) => {
    const testCases = [];
    const regex = /\\\/\s*should\s+suggest:\s*(\w+(?:\s*,\s*\w+)*)/g;
    for (const match of fileText.matchAll(regex)) {
        const {index} = match;
        const [, joinedWords] = match;
        const lines = fileText.slice(0, index).split('\n');
        // matched string points to a character on the next line,
        // one position to the right from "\", hence the "+1"s
        const line = lines.length;
        const character = lines.slice(-1)[0].length + 1;
        testCases.push({
            position: new vscode.Position(line, character),
            items: joinedWords.split(/\s*\,\s*/).map(label => ({
                label, kind: vscode.CompletionItemKind.Field,
            })),
        });
    }
    return testCases;
};

async function testCompletion(docUri, position, expectedCompletionList) {
    // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
    const actualCompletionList = (await vscode.commands.executeCommand(
        'vscode.executeCompletionItemProvider', docUri, position
    ));

    const msg = 'actual: ' + (actualCompletionList.items.map(i => i.label).join(', ') || '(no items)');
    assert.ok(actualCompletionList.items.length === expectedCompletionList.items.length, msg);
    expectedCompletionList.items.forEach((expectedItem, i) => {
        const actualItem = actualCompletionList.items[i];
        assert.equal(actualItem.label, expectedItem.label);
        assert.equal(actualItem.kind, expectedItem.kind);
    });
}

const processTestFile = fileName => {
    suite('Should do completion in ' + fileName, () => {
        const docUri = getDocUri(fileName);
        const whenActive = activate(docUri);
        const fileBuffer = fs.readFileSync(docUri.path.replace(/^\/[a-z]:\//, '/'));
        const testCases = parseTestCases(fileBuffer.toString());

        for (const {position, items} of testCases) {
            const title = 'at ' + position.line + ':' + position.character +
                ', expected: ' + items.map(i => i.label).join(', ');
            test(title, async () => {
                await whenActive;
                await testCompletion(docUri, position, {items});
            });
        }
    });
};

// processTestFile('DeepAssocTests/completion.php');
processTestFile('DeepAssocTests/UnitTest.php');
