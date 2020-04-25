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

const opt = <T>(nullable?: T): Opt<T> => nullable ? [nullable] : [];

const findFunctionReturns = (stPsi: Psi<Phrase>): Psi<Phrase>[] => {
    if (stPsi.node.phraseType === PhraseType.FunctionDeclarationBody) {
        // skip anonymous functions, they have their own scope
        return [];
    } else if (stPsi.node.phraseType === PhraseType.ReturnStatement) {
        return [stPsi];
    } else {
        return stPsi.children()
            .flatMap(c => c.asPhrase())
            .flatMap(findFunctionReturns);
    }
};

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

    const resolveAsArrCtor = (exprPsi: IPsi): Type[] =>
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
            });

    const assertFuncRef = (exprPsi: IPsi): Reference[] => {
        return [
            ...exprPsi.asPhrase(PhraseType.FunctionCallExpression)
                .flatMap(psi => psi.reference),
            ...exprPsi.asPhrase(PhraseType.MethodCallExpression)
                .flatMap(psi => psi.children())
                .flatMap(psi => psi.asPhrase(PhraseType.MemberName))
                .flatMap(psi => psi.reference),
            ...exprPsi.asPhrase(PhraseType.ScopedCallExpression)
                .flatMap(psi => psi.children())
                .flatMap(psi => psi.asPhrase(PhraseType.ScopedMemberName))
                .flatMap(psi => psi.reference),
        ];
    };

    const resolveAsFuncCall = (exprPsi: IPsi): Type[] =>
        assertFuncRef(exprPsi)
            .flatMap(ref => symbolStore.findSymbolsByReference(ref, MemberMergeStrategy.None))
            .flatMap(sym => opt(symbolStore.symbolLocation(sym)))
            .flatMap(loc => getPsiAt({uri: loc.uri, position: loc.range.end}))
            .flatMap(decl => decl.asToken(TokenType.CloseBrace))
            .flatMap(bracePsi => bracePsi.parent())
            .flatMap(par => par.asPhrase(
                PhraseType.FunctionDeclarationBody,
                PhraseType.CompoundStatement,
            ))
            .flatMap(funcBody => funcBody.children())
            .flatMap(psi => psi.asPhrase(PhraseType.StatementList))
            .flatMap(stList => stList.children().flatMap(psi => psi.asPhrase()))
            .flatMap(findFunctionReturns)
            .flatMap(retPsi => retPsi.children().slice(1).flatMap(psi => psi.asPhrase()))
            .flatMap(resolveExpr);

    const resolveVarRef = (exprPsi: IPsi): Type[] =>
        exprPsi.asPhrase(PhraseType.SimpleVariable)
            .flatMap(_ => _.asPhrase(PhraseType.SimpleVariable))
            .flatMap(arrExpr => arrExpr.reference)
            .flatMap(ref => symbolStore.findSymbolsByReference(ref, MemberMergeStrategy.None))
            .flatMap(sym => opt(symbolStore.symbolLocation(sym)))
            .flatMap(loc => getPsiAt({uri: loc.uri, position: loc.range.end}))
            .flatMap(psi => psi.asToken(TokenType.VariableName))
            .flatMap(leaf => leaf.parent())
            .filter(par => par.node.phraseType === PhraseType.SimpleVariable)
            .flatMap(leaf => leaf.parent()
                .filter(par => par.node.phraseType === PhraseType.SimpleAssignmentExpression)
                .filter(ass => ass.nthChild(0).some(leaf.eq))
            )
            .flatMap(ass => ass.children().slice(1).flatMap(psi => psi.asPhrase()))
            .flatMap(resolveExpr);

    const resolveExpr = (exprPsi: IPsi): Type[] => {
        const result = [
            ...resolveAsArrCtor(exprPsi),
            ...resolveAsFuncCall(exprPsi),
            ...resolveVarRef(exprPsi),
        ];
        if (!result.length) {
            //Log.info({'ololo no results for': exprPsi + ''});
        }
        return result;
    };

    const getCompletions = (psi: IPsi): CompletionItem[] => {
        return psi.asToken(TokenType.StringLiteral)
            .flatMap(lit => lit.parent())
            .flatMap(psi => psi.asPhrase(PhraseType.SubscriptExpression))
            .flatMap(assoc => assoc.nthChild(0))
            // TODO: handle other sources of key, like method
            // call, instead of asserting presence of reference
            .flatMap(resolveExpr)
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