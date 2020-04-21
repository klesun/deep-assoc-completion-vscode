import { ParseTreeTraverser } from "intelephense/lib/parseTreeTraverser";
import { Phrase, Token, TokenType, PhraseType } from "php7parser";
import { Reference } from "intelephense/lib/reference";

export type Opt<T> = ([T] | (T[] & []));

export type Node = Phrase | Token;

const asToken = (node: Node): Opt<Token> => {
    return 'tokenType' in node ? [node] : [];
};

const asPhrase = (node: Node): Opt<Phrase> => {
    return 'phraseType' in node ? [node] : [];
};

/**
 * an immutable wrapper around Intelephense's traverser
 *
 * at some point could use linked lists tree for _spine instead of
 * copying it to make it nearly as fast as using traverser itself
 */
const Psi = <T extends Node>({traverser, node}: {
    traverser: ParseTreeTraverser,
    node: T,
}): Psi<T> => {
    return {
        node: node,
        asToken: (tokenType?) => {
            const tokenOpt = asToken(node);
            if (!tokenOpt.length) {
                return [];
            }
            const token = tokenOpt[0];
            if (tokenType && tokenType !== token.tokenType) {
                return [];
            } else {
                return [Psi({traverser, node: tokenOpt[0]})];
            }
        },
        asPhrase: (phraseType?) => {
            const phraseOpt = asPhrase(node);
            if (!phraseOpt.length) {
                return [];
            }
            const phrase = phraseOpt[0];
            if (phraseType && phraseType !== phrase.phraseType) {
                return [];
            } else {
                return [Psi({traverser, node: phraseOpt[0]})];
            }
        },
        parent: () => {
            const newTraverser = traverser.clone();
            newTraverser.parent();
            if (newTraverser.node) {
                return [Psi({
                    traverser: newTraverser,
                    node: newTraverser.node,
                })];
            } else {
                return [];
            }
        },
        nthChild: (n: number) => {
            const newTraverser = traverser.clone();
            newTraverser.nthChild(n);
            if (newTraverser.node) {
                return [Psi({
                    traverser: newTraverser,
                    node: newTraverser.node,
                })];
            } else {
                return [];
            }
        },
        reference: traverser.reference ? [traverser.reference] : [],
    };
};

interface Psi<T extends Node> {
    node: T,
    asToken: (tokenType?: TokenType) => Opt<Psi<Token>>,
    asPhrase: (phraseType?: PhraseType) => Opt<Psi<Phrase>>,
    parent: () => Opt<Psi<Node>>,
    nthChild: (n: number) => Opt<Psi<Node>>,
    reference: Opt<Reference>,
}

export type IPsi = Psi<Node>;

export default Psi;