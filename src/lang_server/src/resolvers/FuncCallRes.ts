import { PhraseType, TokenType, Phrase } from "php7parser";
import Psi, { IPsi } from "../helpers/Psi";
import { Reference } from "intelephense/lib/reference";
import { IApiCtx } from "../contexts/ApiCtx";
import { Type } from "../structures/Type";

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

const FuncCallRes = ({exprPsi, apiCtx}: {
    exprPsi: IPsi, apiCtx: IApiCtx,
}) => {
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
            .flatMap(apiCtx.decl)
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
            .flatMap(apiCtx.resolveExpr);

    return resolveAsFuncCall(exprPsi);
};

export default FuncCallRes;