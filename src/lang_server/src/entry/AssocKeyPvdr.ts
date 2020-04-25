import { SymbolStore } from "intelephense/lib/symbolStore";
import { ParsedDocumentStore, ParsedDocument } from "intelephense/lib/parsedDocument";
import { ReferenceStore, Reference } from "intelephense/lib/reference";
import { CompletionItem } from "vscode-languageserver";
import { ParseTreeTraverser } from "intelephense/lib/parseTreeTraverser";
import * as lsp from 'vscode-languageserver-types';
import { Token, Phrase, PhraseType, LexerMode } from 'php7parser';
import Log from "../Log";

// ts-node, enums
import { TokenType } from 'php7parser';
import Psi, { Opt, IPsi } from "../helpers/Psi";
import { MemberMergeStrategy } from "intelephense/lib/typeAggregate";
import { Type } from "../structures/Type";

/**
 * @param {String} litText - escaped, like "somekey\t\\Ol\"olo"
 * @return {Opt<string>} - unescaped: somekey    \Ol"olo
 */
const unquote = (litText: string): Opt<string> => {
    if (litText.length < 2) {
        return []; // invalid format
    }
    const opening = litText[0];
    const ending = litText.slice(-1)[0];
    if (opening !== ending || !['\'', '"'].includes(opening)) {
        // lol, just googled what backticks do...
        return []; // invalid format
    }
    // TODO: implement
    //  you do not usually use special characters in key name, so skipping for now,
    //  since you anyway would want an escaped line break when completing a key name
    return [litText.slice(1, -1)];
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
            const psi = Psi({traverser, node: traverser.node, doc});
            return [psi];
        }
    };

    const findExprType = (exprPsi: IPsi): Type[] => {
        const typeChunks: Type[][] = [
            exprPsi.asPhrase(PhraseType.ArrayCreationExpression)
                .flatMap(arrCtor => arrCtor.children())
                .flatMap(subPsi => subPsi.asPhrase(PhraseType.ArrayInitialiserList))
                .map(listPsi => {
                    const keyNames = listPsi.children()
                        .flatMap(subPsi => subPsi.asPhrase(PhraseType.ArrayElement))
                        .flatMap(elPsi => elPsi.children())
                        .flatMap(subPsi => subPsi.asPhrase(PhraseType.ArrayKey))
                        .flatMap(keyPsi => keyPsi.children())
                        .flatMap(subPsi => subPsi.asToken(TokenType.StringLiteral))
                        .flatMap(strLit => unquote(strLit.text()));
                    return {
                        kind: 'IRecordArr',
                        entries: keyNames.map(content => ({
                            keyType: {kind: 'IStr', content},
                            valueType: {kind: 'IAny'},
                        })),
                    };
                }),
        ];
        return typeChunks.flatMap(a => a);
    };

    const getCompletions = (psi: IPsi): CompletionItem[] => {
        return psi.asToken(TokenType.StringLiteral)
            .flatMap(lit => lit.parent())
            .flatMap(psi => psi.asPhrase(PhraseType.SubscriptExpression))
            .flatMap(assoc => assoc.nthChild(0))
            // TODO: handle other sources of key, like method
            // call, instead of asserting presence of reference
            .flatMap(arrExpr => arrExpr.reference)
            .flatMap(ref => symbolStore
                .findSymbolsByReference(ref, MemberMergeStrategy.None)
                .flatMap(sym => sym.location ? [sym.location] : [])
                .flatMap(sym => getPsiAt({
                    uri: ref.location.uri,
                    position: sym.range.end,
                }))
            )
            .flatMap(psi => psi.asToken(TokenType.VariableName))
            .flatMap(leaf => leaf.parent())
            .filter(par => par.node.phraseType === PhraseType.SimpleVariable)
            .flatMap(leaf => leaf.parent()
                .filter(par => par.node.phraseType === PhraseType.SimpleAssignmentExpression)
                .filter(ass => ass.nthChild(0).some(leaf.eq))
            )
            .flatMap(ass => ass.children().slice(1).flatMap(psi => psi.asPhrase()))
            .flatMap(findExprType)
            .flatMap(t => t.kind === 'IRecordArr' ? t.entries : [])
            .map(e => e.keyType)
            .flatMap(kt => kt.kind === 'IStr' ? [kt.content] : [])
            .map((label, i) => ({
                label, sortText: (i + '').padStart(7, '0'),
                detail: 'deep-assoc FTW',
            }));
    };

    const main = async () => {
        return getPsiAt({uri, position})
            .flatMap(getCompletions);
    };


    return main();
};

export default AssocKeyPvdr;