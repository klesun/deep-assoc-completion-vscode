import { Opt, opt } from "../../helpers/Psi";
import { Type, IRecordEntry, IRecordArr } from "../Type";
const {mkReg} = require('klesun-node-tools/src/Utils/Misc.js');

/**
 * @see https://github.com/klesun/deep-assoc-completion/blob/master/src/org/klesun/deep_assoc_completion/structures/psalm/PsalmTypeExprParser.java
 *
 * @see https://psalm.dev/docs/docblock_type_syntax/#array-types
 *
 * parses PSALM-format phpdoc tag string, example:
 *
 * @var \Generator<array{
 *     itemNo:string,
 *     variants:array<array{
 *         Code:string,
 *         stock:array<array{
 *                 serialNo:string,
 *                 locationCode:string,
 *                 differentialTaxation:bool
 *             }>
 *         }>
 *     }>
 * $products
 */
const PsalmTypeExprParser = (text: string) => {
    let offset = 0;

    const getTextLeft = () => text.slice(offset);

    const unprefix = (regex: RegExp) => {
        // for simplicity sake, taking a substring for now, but perfectly would
        // be to work with full string and pass offset to the regex function
        const textLeft = getTextLeft();
        const match = textLeft.match(mkReg([/^/, regex]));
        // Tls.regexWithFull(regex + "(.*)", textLeft, Pattern.DOTALL);
        if (!match) {
            return null;
        } else {
            const shift = match[0].length;
            if (shift < 1) {
                // could lead to an infinite loop if you have a mistake in some of regexes
                const msg = "Empty pattern match in PSALM parser - /" +
                    regex + "/ on text - " + textLeft.slice(0, 20);
                throw new Error(msg);
            }
            offset += shift;
            return match;
        }
    };

    const parseTypeList = (): Opt<Type[]> => {
        const types: Type[] = [];
        do {
            const type = parseMultiValue();
            if (type.length) {
                types.push(type[0]);
            } else {
                return [];
            }
        } while (unprefix(/\s*,\s*/));

        return [types];
    };

    const parseString = (quote: string): Opt<string> => {
        let escape = false;
        let result = '';
        for (; offset < text.length; ++offset) {
            const ch = text.charAt(offset);
            if (escape) {
                result += ch;
                escape = false;
            } else if (ch === '\\') {
                escape = true;
            } else if (ch === quote) {
                ++offset;
                return [result];
            } else {
                result += ch;
            }
        }
        return [];
    };

    const skipTillClosed = (openCh: string, closeCh: string): string => {
        let level = 1;
        let start = offset;
        for (; offset < text.length; ++offset) {
            const ch = text[offset];
            if (ch === openCh) {
                ++level;
            } else if (ch === closeCh) {
                --level;
                if (level <= 0) {
                    const closed = text.slice(start, offset);
                    ++offset;
                    return closed;
                }
            } else if (ch === '"' || ch === '\'') {
                parseString(ch);
            }
        }
        const closed = text.slice(start);
        offset = text.length;
        return closed;
    };

    const parseAssocKeys = (): Opt<IRecordArr> => {
        const entries: IRecordEntry[] = [];
        const keyToComments: Record<string, string[]> = {};

        let match;
        while (match = unprefix(/\s*(\w+)\s*:\s*/)) {
            const [, keyName] = match;
            const typeOpt = parseMultiValue();
            if (typeOpt.length) {
                const keyType: Type = {kind: 'IStr', content: keyName};
                entries.push({keyType, valueType: typeOpt[0]});
                if (!unprefix(/\s*\,\s*/)) {
                    break; // end of array, since no coma
                }
                // let asComment;
                // while (asComment = unprefix(/\s*\/\/\s*(.*?)\s*\n\s*/)) {
                //     const [, comment] = asComment;
                //     keyToComments[keyName] = keyToComments[keyName] || [];
                //     keyToComments[keyName].push(comment);
                // }
            } else {
                break;
            }
        }
        unprefix(/,\s*/); // optional trailing coma
        if (unprefix(/\s*}\s*/)) {
            return [{kind: 'IRecordArr', entries}];
        } else {
            const unparsed = skipTillClosed('{', '}');
            return [{kind: 'IRecordArr', entries}];
        }
    };

    const parseSignleValue = (): Opt<Type> => {
        unprefix(/\s+/);
        // a comment, just ignore for now
        unprefix(/\/\/.*\n/);
        let parsed: Opt<Type> = [];
        let match;
        if (match = unprefix(/([a-zA-Z\\_][a-zA-Z\\_0-9]*)\s*<\s*/)) {
            const [, fqn] = match;
            const genericsOpt = parseTypeList();
            if (genericsOpt.length) {
                parsed = [{
                    kind: 'IFqn', fqn,
                    generics: genericsOpt[0],
                }];
            }
        } else if (unprefix(/array\s*\{\s*/)) {
            parsed = parseAssocKeys();
        } else if (match = unprefix(/([a-zA-Z\\_][a-zA-Z\\_0-9]*)\s*/)) {
            // should be put after SomeClass::class check when it is implemented
            const [, fqn] = match;
            parsed = [{kind: 'IFqn', fqn, generics: []}];
        // } else if (match = unprefix(/(\d+\.\+d+)/)) {
        //     const [, value] = match;
        //     parsed = som(new TPrimitive(PhpType.FLOAT, value));
        // } else if (match = unprefix(/(\d+)/)) {
        //     const [, value] = match;
        //     parsed = som(new TPrimitive(PhpType.INT, value));
        // } else if (match = unprefix(/true\b/i)) {
        //     parsed = som(new TPrimitive(PhpType.TRUE, "1"));
        // } else if (unprefix(/false\b/i)) {
        //     parsed = som(new TPrimitive(PhpType.FALSE, ""));
        } else if (match = unprefix(/['"]/)) {
            const quote = match[0][0];
            const strOpt = parseString(quote);
            parsed = !strOpt.length ? [] : [{
                kind: 'IStr', content: strOpt[0]
            }];
        } else {
            // TODO: support rest
        }

        return parsed;
    };

    const parseMultiValue = (): Opt<Type> => {
        // TODO: support multi
        return parseSignleValue();
    };

    return parseMultiValue().map(type => ({
        type, textLeft: getTextLeft(),
    }));
};

export default PsalmTypeExprParser;