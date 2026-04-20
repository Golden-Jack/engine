import { randomUUID } from 'uncrypto';

import type { EconomyConfig } from '../config/EconomyConfig';
import type { GameConfig } from '../config/GameConfig';

import { Deck } from '../models/Deck';
import type { Player } from '../models/Player';
import { Round } from './Round';
import { GameState } from './GameState';

export class Game {
    readonly id: string;
    private readonly _rounds: Round[] = [];
    private deck: Deck;

    constructor(
        private players: Player[],
        private readonly gameConfig: GameConfig,
        private readonly economyConfig: EconomyConfig
    ) {
        if (this.players.length === 0) throw new Error('A game must have at least 1 player');
        this.id = randomUUID();
        this.deck = new Deck(gameConfig.numberOfDecks);
    }

    get rounds(): readonly Round[] {
        return this._rounds;
    }

    addPlayer(player: Player): void {
        if (this.players.length >= this.gameConfig.maxGamePlayers) throw new Error('Maximum players number reached');
        if (this.isMidRound()) throw new Error('Cannot add player mid round');
        this.players.push(player);
    }

    removePlayer(playerId: string): void {
        if (this.isMidRound()) throw new Error('Cannot remove player mid round');
        const index = this.players.findIndex(player => player.id === playerId);
        if (index >= 0) this.players.splice(index, 1);
    }

    private isMidRound(): boolean {
        const lastRound = this._rounds[this._rounds.length - 1];
        if (!lastRound) return false;
        return lastRound.state !== GameState.END && lastRound.state !== GameState.BET;
    }

    startRound(): void {
        if (this.isMidRound()) throw new Error('Cannot run 2 rounds at once');

        if (this.deck.size / this.deck.fullSize < this.gameConfig.shuffleThreshold) {
            this.deck.shuffle();
        }

        this._rounds.push(new Round(this.players, this.deck, this.gameConfig, this.economyConfig));
    }
}