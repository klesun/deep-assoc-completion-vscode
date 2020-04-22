import { ParseTreeTraverser } from "intelephense/lib/parseTreeTraverser";
import { Phrase, Token, TokenType, PhraseType } from "php7parser";
import { Reference } from "intelephense/lib/reference";
import { ParsedDocument } from "intelephense/lib/parsedDocument";

export type Opt<T> = ([T] | (T[] & []));

export type Node = Phrase | Token;

const asTokenNode = (node: Node): Opt<Token> => {
    return 'tokenType' in node ? [node] : [];
};

const asPhraseNode = (node: Node): Opt<Phrase> => {
    return 'phraseType' in node ? [node] : [];
};

const describeNode = (node: Phrase | Token | null, doc: ParsedDocument): string => {
    if (!node) {
        return '(no node)';
    } else if ('phraseType' in node) {
        const subDescrs = node.children.map(subNode => describeNode(subNode, doc));
        return `${PhraseType[node.phraseType]}(${subDescrs.join(', ')})`;
    } else {
        const text = doc.text.slice(node.offset, node.offset + Math.min(node.length, 20));
        return `${TokenType[node.tokenType]}(${text}) at ${node.offset}, ${node.length}`;
    }
};

/**
 * an immutable wrapper around Intelephense's traverser
 *
 * at some point could use linked lists tree for _spine instead of
 * copying it to make it nearly as fast as using traverser itself
 */
const Psi = <T extends Node>({traverser, node, doc}: {
    traverser: ParseTreeTraverser,
    node: T,
    doc: ParsedDocument,
}): Psi<T> => {
    const asPhrase = (phraseType?: PhraseType): Opt<Psi<Phrase>> => {
        const phraseOpt = asPhraseNode(node);
        if (!phraseOpt.length) {
            return [];
        }
        const phrase = phraseOpt[0];
        if (phraseType && phraseType !== phrase.phraseType) {
            return [];
        } else {
            return [Psi({traverser, node: phraseOpt[0], doc})];
        }
    };

    const nthChild = (n: number): Opt<Psi<Node>> => {
        const newTraverser = traverser.clone();
        newTraverser.nthChild(n);
        if (newTraverser.node) {
            return [Psi({
                traverser: newTraverser,
                node: newTraverser.node,
                doc,
            })];
        } else {
            return [];
        }
    };

    return {
        node: node,
        asToken: (tokenType?) => {
            const tokenOpt = asTokenNode(node);
            if (!tokenOpt.length) {
                return [];
            }
            const token = tokenOpt[0];
            if (tokenType && tokenType !== token.tokenType) {
                return [];
            } else {
                return [Psi({traverser, node: tokenOpt[0], doc})];
            }
        },
        asPhrase: asPhrase,
        parent: () => {
            const newTraverser = traverser.clone();
            newTraverser.parent();
            if (newTraverser.node && 'phraseType' in newTraverser.node) {
                return [Psi({
                    traverser: newTraverser,
                    node: newTraverser.node,
                    doc,
                })];
            } else {
                return [];
            }
        },
        children: () => asPhrase()
            .flatMap(p => p.node.children)
            .flatMap((node, i) => nthChild(i)),
        nthChild: nthChild,
        reference: traverser.reference ? [traverser.reference] : [],
        toString() {
            return describeNode(node, doc);
        },
        eq: other => other.node === node,
    };
};

interface Psi<T extends Node> {
    node: T,
    asToken: (tokenType?: TokenType) => Opt<Psi<Token>>,
    asPhrase: (phraseType?: PhraseType) => Opt<Psi<Phrase>>,
    parent: () => Opt<Psi<Phrase>>,
    nthChild: (n: number) => Opt<Psi<Node>>,
    children: () => Psi<Node>[],
    reference: Opt<Reference>,
    toString: () => string,
    eq: (other: Psi<Node>) => boolean,
}

export type IPsi = Psi<Node>;

export default Psi;