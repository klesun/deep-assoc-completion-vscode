import { SymbolStore } from "intelephense/lib/symbolStore";
import { ParsedDocumentStore } from "intelephense/lib/parsedDocument";
import { ReferenceStore, Reference } from "intelephense/lib/reference";
import { CompletionItem } from "vscode-languageserver";
import { ParseTreeTraverser } from "intelephense/lib/parseTreeTraverser";
import * as lsp from 'vscode-languageserver-types';
import { Token, Phrase, PhraseType, LexerMode } from 'php7parser';
import Log from "../Log";

// ts-node, enums
import { TokenType } from 'php7parser';

const asToken = (traverser: ParseTreeTraverser): Token | null => {
    return traverser.node && 'tokenType' in traverser.node ? traverser.node : null;
};

const asPhrase = (traverser: ParseTreeTraverser): Phrase | null => {
    return traverser.node && 'phraseType' in traverser.node ? traverser.node : null;
};

/** immutable unlike the traverser */
const Psi = (traverser: ParseTreeTraverser) => {
    return {
        node: traverser.node,
        asToken: () => asToken(traverser),
        asPhrase: () => asPhrase(traverser),
        parent: () => {
            const newTraverser = traverser.clone();
            newTraverser.parent();
            if (newTraverser.node) {
                return Psi(newTraverser);
            } else {
                return null;
            }
        },
        nthChild: (n: number) => {
            const newTraverser = traverser.clone();
            newTraverser.nthChild(n);
            if (newTraverser.node) {
                return Psi(newTraverser);
            } else {
                return null;
            }
        },
        reference: traverser.reference || null,
    };
};

type Psi = ReturnType<typeof Psi>;

const AssocKeyPvdr = async ({
    symbolStore, documentStore, refStore, uri, position,
}: {
    symbolStore: SymbolStore,
    documentStore: ParsedDocumentStore,
    refStore: ReferenceStore,

    uri: string,
    position: lsp.Position,
}): Promise<CompletionItem[]> => {
    const doc = documentStore.find(uri);
    const table = symbolStore.getSymbolTable(uri);
    const refTable = refStore.getReferenceTable(uri);

    if (!doc || !table || !refTable) {
        return [];
    }

    const describeNode = (node?: Phrase | Token): string => {
        if (!node) {
            return '(no node)';
        } else if ('phraseType' in node) {
            const subDescrs = node.children.map(describeNode);
            return `${PhraseType[node.phraseType]}(${subDescrs.join(', ')})`;
        } else {
            const text = doc.text.slice(node.offset, node.offset + Math.min(node.length, 20));
            return `${TokenType[node.tokenType]}(${text}) at ${node.offset}, ${node.length}`;
        }
    };

    const getCompletions = async (traverser: ParseTreeTraverser, word: string): Promise<CompletionItem[]> => {
        Log.info({msg: "ololo get completions", word, node: describeNode(traverser.node)});
        const lit = Psi(traverser);
        if (lit?.asToken()?.tokenType !== TokenType.StringLiteral) {
            return [];
        }
        const assoc = lit.parent();
        if (assoc?.asPhrase()?.phraseType !== PhraseType.SubscriptExpression) {
            return [];
        }
        const arrExpr = assoc.nthChild(0);
        // TODO: handle other sources of key, like method
        // call, instead of asserting presence of reference
        if (!arrExpr || !arrExpr.reference) {
            return [];
        }
        //Log.info({msg: 'ololo parent - ' + describeNode(arrExpr?.node)});
        Log.info({"ololo ref": arrExpr.reference});
        // TODO: implement further!
        const completionText = arrExpr.reference.type || '(pls specify var type in phpdoc)';

        return [{label: completionText}];
    };

    const main = () => {
        const traverser = new ParseTreeTraverser(doc, table, refTable);
        traverser.position(position);

        //return early if not in <?php ?>
        const t = traverser.node as Token;
        if (!t || t.tokenType === TokenType.Text) {
            return [];
        }

        const offset = doc.offsetAtPosition(position);
        const word = doc.wordAtOffset(offset);

        return getCompletions(traverser, word);
    };


    return main();
};

export default AssocKeyPvdr;