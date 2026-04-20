import { randomUUID } from 'uncrypto';

export enum Type {
    HEART = 'HEART',
    DIAMOND = 'DIAMOND',
    CLUB = 'CLUB',
    SPADE = 'SPADE'
}

export enum Rank {
    ACE = 'A',
    TWO = '2',
    THREE = '3',
    FOUR = '4',
    FIVE = '5',
    SIX = '6',
    SEVEN = '7',
    EIGHT = '8',
    NINE = '9',
    TEN = '10',
    JACK = 'J',
    QUEEN = 'Q',
    KING = 'K'
}

const SYMBOLS: Record<Type, string> = {
    [Type.HEART]: '♥',
    [Type.DIAMOND]: '♦',
    [Type.CLUB]: '♣',
    [Type.SPADE]: '♠'
}

const VALUES: Record<Rank, number> = {
    [Rank.ACE]: 11,
    [Rank.TWO]: 2,
    [Rank.THREE]: 3,
    [Rank.FOUR]: 4,
    [Rank.FIVE]: 5,
    [Rank.SIX]: 6,
    [Rank.SEVEN]: 7,
    [Rank.EIGHT]: 8,
    [Rank.NINE]: 9,
    [Rank.TEN]: 10,
    [Rank.JACK]: 10,
    [Rank.QUEEN]: 10,
    [Rank.KING]: 10
}

export class Card {
    readonly id: string;

    constructor (
        public readonly rank: Rank,
        public readonly type: Type,
        id?: string
    ) {
        this.id = id ?? randomUUID();
    }

    get symbol(): string {
        return SYMBOLS[this.type];
    }

    get value(): number {
        return VALUES[this.rank];
    }
}