import { Type, Card, Rank } from './Card';

const random = (max: number) => {
    const buf = new Uint32Array(1);
    const threshold = Math.floor(0xFFFFFFFF / max) * max;

    let value: number;
    do {
        crypto.getRandomValues(buf);
        value = buf[0]!;
    } while (value >= threshold);

    return value % max;
}

export class Deck {
    private readonly cards: Card[] = [];
    private readonly discard: Card[] = [];
    readonly fullSize: number;

    constructor(nDecks: number) {
        if (nDecks < 1) throw new Error('Must have at least one deck');
        this.init(nDecks);
        this.fullSize = this.size;
    }

    private init(nDecks: number): void {
        for (let i = 0; i < nDecks; i++) {
            for (const type of Object.values(Type) as Type[]) {
                for (const rank of Object.values(Rank) as Rank[]) {
                    this.cards.push(new Card(rank, type));
                }
            }
        }
        this.shuffle();
    }

    shuffle(): void {
        this.cards.push(...this.discard);
        this.discard.splice(0);

        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [this.cards[i], this.cards[j]] = [this.cards[j]!, this.cards[i]!];
        }
    }

    draw(): Card {
        if (this.isEmpty) throw new Error('Deck is empty');
        const card: Card = this.cards.pop()!;
        this.discard.push(card);
        return card;
    }

    get size(): number {
        return this.cards.length;
    }

    get isEmpty(): boolean {
        return this.cards.length === 0;
    }
}