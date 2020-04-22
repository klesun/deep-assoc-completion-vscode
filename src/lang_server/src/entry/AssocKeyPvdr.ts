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
            Log.info({'lololo getPsiAt': psi + ''});
            return [psi];
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
            .flatMap(arrCtor => {
                Log.info({"ololo arrCtor": arrCtor + ''});
                return [];
            });
    };

    const main = async () => {
        return getPsiAt({uri, position})
            .flatMap(getCompletions);
    };


    return main();
};

export default AssocKeyPvdr;