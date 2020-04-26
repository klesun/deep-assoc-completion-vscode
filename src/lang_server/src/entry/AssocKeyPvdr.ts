import { SymbolStore } from "intelephense/lib/symbolStore";
import { CompletionItem } from "vscode-languageserver";
import * as lsp from 'vscode-languageserver-types';
import { Token, Phrase, PhraseType, LexerMode } from 'php7parser';

// ts-node, enums
import { TokenType } from 'php7parser';
import Psi, { Opt, IPsi } from "../helpers/Psi";
import { Type } from "../structures/Type";
import { IApiCtx } from "../contexts/ApiCtx";

const AssocKeyPvdr = (params: {
    apiCtx: IApiCtx,
    psi: IPsi,
}): CompletionItem[] => {
    const apiCtx = params.apiCtx;

    const getCompletions = (psi: IPsi): CompletionItem[] => {
        return psi.asToken(TokenType.StringLiteral)
            .flatMap(lit => lit.parent())
            .flatMap(psi => psi.asPhrase(PhraseType.SubscriptExpression))
            .flatMap(assoc => assoc.nthChild(0))
            .flatMap(apiCtx.resolveExpr)
            .flatMap(t => t.kind === 'IRecordArr' ? t.entries : [])
            .map(e => e.keyType)
            .flatMap(kt => kt.kind === 'IStr' ? [kt.content] : [])
            .map((label, i) => ({
                label, sortText: (i + '').padStart(7, '0'),
                detail: 'deep-assoc FTW',
                kind: lsp.CompletionItemKind.Field,
            }));
    };

    const main = () => {
        return getCompletions(params.psi);
    };

    return main();
};

export default AssocKeyPvdr;