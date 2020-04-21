import { SymbolStore } from "intelephense/lib/symbolStore";
import { ParsedDocumentStore, ParsedDocument } from "intelephense/lib/parsedDocument";
import { ReferenceStore, Reference } from "intelephense/lib/reference";
import { CompletionItem } from "vscode-languageserver";
import { ParseTreeTraverser } from "intelephense/lib/parseTreeTraverser";
import * as lsp from 'vscode-languageserver-types';
import { Token, Phrase, PhraseType, LexerMode } from 'php7parser';
import Log from "../Log";
import { Location } from 'vscode-languageserver-types';

// ts-node, enums
import { TokenType } from 'php7parser';
import Psi, { Opt, IPsi } from "../helpers/Psi";
import { MemberMergeStrategy } from "intelephense/lib/typeAggregate";

const describeNode = (node: Phrase | Token | null, doc: ParsedDocument): string => {
    if (!node) {
        return '(no node)';
    } else if ('phraseType' in node) {
        const subDescrs = node.children.map(subNode => describeNode(subNode, doc));
        return `${PhraseType[node.phraseType]}(${subDescrs.join(', ')})`;
    } else {
        const text = doc.text.slice(node.offset, node.offset + Math.min(node.length, 20));
        return `${TokenType[node.tokenType]}(${text}) at ${node.offset}, ${node.length}`;
    }
};

const AssocKeyPvdr = async ({
    symbolStore, documentStore, refStore, uri, position,
}: {
    symbolStore: SymbolStore,
    documentStore: ParsedDocumentStore,
    refStore: ReferenceStore,

    uri: string,
    position: lsp.Position,
}): Promise<CompletionItem[]> => {
    const table = symbolStore.getSymbolTable(uri);
    const refTable = refStore.getReferenceTable(uri);

    if (!table || !refTable) {
        return [];
    }

    const getPsiAt = ({uri, position}: {uri: string, position: lsp.Position}): Opt<IPsi> => {
        const doc = documentStore.find(uri);
        if (!doc) {
            return [];
        }
        const traverser = new ParseTreeTraverser(doc, table, refTable);
        traverser.position(position);
        if (!traverser.node) {
            return [];
        } else {
            Log.info({'lololo getPsiAt': describeNode(traverser.node, doc)});
            return [Psi({traverser, node: traverser.node})];
        }
    };

    const getCompletions = (psi: IPsi): CompletionItem[] => {
        return psi.asToken(TokenType.StringLiteral)
            .flatMap(lit => lit.parent())
            .flatMap(psi => psi.asPhrase(PhraseType.SubscriptExpression))
            .flatMap(assoc => assoc.nthChild(0))
            // TODO: handle other sources of key, like method
            // call, instead of asserting presence of reference
            .flatMap(arrExpr => arrExpr.reference)
            .flatMap(ref => symbolStore.findSymbolsByReference(ref, MemberMergeStrategy.None))
            .flatMap(sym => sym.location ? [sym.location] : [])
            // .flatMap(loc => {
            //     return getPsiAt({
            //         uri: loc.uri,
            //         position: loc.range.end,
            //     });
            // })
            .flatMap(sym => {
                Log.info({"ololo sym decl": sym});
                return [];
            });
        // const completionText = arrExpr.reference.type || '(pls specify var type in phpdoc)';
        // const arrDecl = arrExpr.reference.location;
        // return [{label: completionText}];
    };

    const main = async () => {
        return getPsiAt({uri, position})
            .flatMap(getCompletions);
    };


    return main();
};

export default AssocKeyPvdr;