import { Type } from "../structures/Type";
import { IPsi, Opt } from "../helpers/Psi";
import { PhraseType, TokenType } from "php7parser";
import { IApiCtx } from "../contexts/ApiCtx";
import Log from "../Log";

/** removes stars */
const getDocCommentText = (docCommentToken: string): Opt<string> => {
    const match = docCommentToken.match(/^\/\*\**(?:\s*\n)(.*)\*\/$/s);
    if (!match) {
        return [];
    } else {
        const clean = match[1].split('\n')
            .map(l => l.replace(/^\s*\*\s?/, ''))
            .join('\n');
        return [clean];
    }
};

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
                    .filter(par => par.node.phraseType === PhraseType.ParameterDeclaration)
                    .flatMap(psi => psi.parent())
                    .filter(par => par.node.phraseType === PhraseType.ParameterDeclarationList)
                    .flatMap(psi => psi.parent())
                    .filter(par => par.node.phraseType === PhraseType.FunctionDeclarationHeader)
                    .flatMap(psi => psi.parent())
                    .filter(par => par.node.phraseType === PhraseType.FunctionDeclaration)
                    .flatMap(psi => {
                        let prevOpt: IPsi[] = psi.prevSibling();
                        while (prevOpt.some(psi => psi.asToken(TokenType.Whitespace).length)) {
                            prevOpt = prevOpt.flatMap(psi => psi.prevSibling());
                        }
                        return prevOpt;
                    })
                    .flatMap(par => par.asToken(TokenType.DocumentComment))
                    .flatMap(psi => getDocCommentText(psi.text()))
                    .flatMap(argDecl => {
                        Log.info("ololo argDecl " + argDecl);
                        return [];
                    }),
            ]);
    };

    return resolveVarRef(exprPsi);
};

export default VarRes;