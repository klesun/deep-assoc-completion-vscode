import { Type } from "../structures/Type";
import { IPsi, Opt } from "../helpers/Psi";
import { PhraseType, TokenType } from "php7parser";
import { IApiCtx } from "../contexts/ApiCtx";
import Log from "../Log";
import ArgRes from "./ArgRes";

const VarRes = ({exprPsi, apiCtx}: {
    exprPsi: IPsi, apiCtx: IApiCtx,
}): Type[] => {
    const resolveVarRef = (exprPsi: IPsi) => {
        return exprPsi.asPhrase(PhraseType.SimpleVariable)
            .flatMap(psi => psi.asPhrase(PhraseType.SimpleVariable))
            .flatMap(arrExpr => arrExpr.reference)
            .flatMap(apiCtx.decl)
            .flatMap(psi => psi.asToken(TokenType.VariableName))
            .flatMap(leaf => [
                ...leaf.parent()
                    .filter(par => par.node.phraseType === PhraseType.SimpleVariable)
                    .flatMap(leaf => leaf.parent()
                        .filter(par => par.node.phraseType === PhraseType.SimpleAssignmentExpression)
                        .filter(ass => ass.nthChild(0).some(leaf.eq))
                    )
                    .flatMap(ass => ass.children().slice(1).flatMap(psi => psi.asPhrase()))
                    .flatMap(apiCtx.resolveExpr),
                ...leaf.parent()
                    .flatMap(exprPsi => ArgRes({exprPsi, apiCtx})),
            ]);
    };

    return resolveVarRef(exprPsi);
};

export default VarRes;