import { IPsi, Opt } from "../helpers/Psi";
import { IApiCtx } from "../contexts/ApiCtx";
import { Type } from "../structures/Type";
import { PhraseType, TokenType } from "php7parser";
import Log from "../Log";
import PsalmTypeExprParser from "../structures/psalm/PsalmTypeExprParser";

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

interface RawDocTag {
    tagName: string;
    textLeft: string;
}

const getRawTags = (docText: string) => {
    const tags = [];
    let current: Opt<RawDocTag> = [];
    for (const line of docText.split('\n')) {
        const match = line.match(/^\s*@([\w\-]+)\s*(.*)/);
        if (match) {
            const [, tagName, textLeft] = match;
            tags.push(...current);
            current = [{tagName, textLeft}];
        } else if (current.length) {
            current = [{
                tagName: current[0].tagName,
                textLeft: current[0].textLeft + '\n' + line,
            }];
        }
    }
    tags.push(...current);
    return tags;
};

const ArgRes = ({exprPsi, apiCtx}: {
    exprPsi: IPsi, apiCtx: IApiCtx,
}): Type[] => {
    const resolveArg = (exprPsi: IPsi) => {
        const argNameOpt = exprPsi.children()
            .flatMap(psi => psi.asToken(TokenType.VariableName))
            .map(psi => psi.text().slice(1));

        return exprPsi.asPhrase(PhraseType.ParameterDeclaration)
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
            .flatMap(getRawTags)
            .filter(rawTag => ['param', 'psalm-param'].includes(rawTag.tagName))
            .flatMap(rawTag => PsalmTypeExprParser(rawTag.textLeft))
            .filter(parsed => argNameOpt.every(argName => {
                const tagArgName = parsed.textLeft.trim()
                    .replace(/^\$(\w+).*/s, '$1');
                return tagArgName === argName;
            }))
            .map(parsed => parsed.type);
    };

    return resolveArg(exprPsi);
};

export default ArgRes;