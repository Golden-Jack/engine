import { Card, Rank } from './Card';

export class Hand implements Iterable<Card> {
    readonly cards: Card[] = [];

    [Symbol.iterator](): Iterator<Card> {
        return this.cards[Symbol.iterator]();
    }

    add(card: Card): void {
        this.cards.push(card);
    }

    get score(): number {
        let score: number = 0;
        let aces: number = 0;

        for (const card of this.cards) {
            score += card.value;
            if (card.rank === Rank.ACE) aces++;
        }

        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    get size(): number {
        return this.cards.length;
    }

    get isBlackjack(): boolean {
        return this.size === 2 && this.score === 21;
    }

    get isBust(): boolean {
        return this.score > 21;
    }

    get isSoft(): boolean {
        let raw = 0;
        let aces = 0;

        for (const card of this.cards) {
            raw += card.value;
            if (card.rank === Rank.ACE) aces++;
        }

        return aces > 0 && raw <= 21;
    }
}