import { IPsi, Opt } from "../helpers/Psi";
import { IApiCtx } from "../contexts/ApiCtx";
import { Type } from "../structures/Type";
import { PhraseType, TokenType } from "php7parser";

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

const ArrCtorRes = ({exprPsi, apiCtx}: {
    exprPsi: IPsi, apiCtx: IApiCtx,
}): Type[] => {
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

    return resolveAsArrCtor(exprPsi);
};

export default ArrCtorRes;