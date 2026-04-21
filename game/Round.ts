import type { GameConfig } from '../config/GameConfig';
import type { EconomyConfig } from '../config/EconomyConfig';

import type { Deck } from '../models/Deck';
import { Hand } from '../models/Hand';
import { Player } from '../models/Player';
import { GameState } from './GameState';
import { Casino } from './Casino';
import { Outcome } from './Outcome';
import { HandEvaluator } from './HandEvaluator';

export class Round {
    private _state: GameState = GameState.BET;
    private readonly playerHands: Map<string, Hand>;
    readonly dealerHand: Hand;
    private readonly bets: Map<string, number> = new Map<string, number>();
    private readonly outcomes: Map<string, Outcome> = new Map<string, Outcome>();
    private currentPlayerIndex: number = 0;

    constructor(
        private readonly players: Player[],
        private readonly deck: Deck,
        private readonly gameConfig: GameConfig,
        private readonly economyConfig: EconomyConfig
    ) {
        if (players.length === 0) throw new Error('A round needs at least one player to start');

        this.dealerHand = new Hand(gameConfig);
        this.playerHands = new Map<string, Hand>();
        for (const player of players) {
            this.playerHands.set(player.id, new Hand(gameConfig));
        }
    }

    get state(): GameState {
        return this._state;
    }

    bet(playerId: string, amount: number): void {
        const player = this.findPlayer(playerId);
        if (!player) throw new Error('Player not in the game');
        if (player.balance < amount) throw new Error('Insufficient balance');
        if (this._state !== GameState.BET) throw new Error('Must be the betting phase');
        if (this.bets.has(playerId)) throw new Error('Player has already bet');
        if (amount < this.economyConfig.minBet) throw new Error('Bet too low');
        if (this.economyConfig.maxBet && amount > this.economyConfig.maxBet) throw new Error('Bet too high');
        if (!Casino.instance.canCover(amount * this.gameConfig.blackjackPayout)) throw new Error('Casino cannot cover this bet');

        player.debit(amount);
        Casino.instance.credit(amount);
        this.bets.set(player.id, amount);

        if (this.players.every(player => this.bets.has(player.id))) {
            this._state = GameState.DEAL;
            this.deal();
        }
    }

    private findPlayer(id: string): Player | undefined {
        return this.players.find(player => player.id === id);
    }

    private deal(): void {
        if (this._state !== GameState.DEAL) throw new Error('Must be in dealing phase');

        for (let i = 0; i < this.gameConfig.dealCardsNumber; i++) {
            for (const player of this.players) {
                this.getHandOrThrow(player.id).add(this.deck.draw());
            }

            this.dealerHand.add(this.deck.draw());
        }

        this._state = GameState.PLAYER;

        this.skipOnBJ();
    }

    findHand(playerId: string): Hand | undefined {
        return this.playerHands.get(playerId);
    }

    private getHandOrThrow(playerId: string): Hand {
        const hand = this.playerHands.get(playerId);
        if (!hand) throw new Error('No hand for this player');
        return hand;
    }

    hit(playerId: string): void {
        this.ensurePlayerCanPlay(playerId);

        const hand: Hand = this.getHandOrThrow(playerId);
        hand.add(this.deck.draw());

        if (hand.isBust || hand.score === this.gameConfig.bustThreshold) this.nextPlayer();
    }

    stand(playerId: string): void {
        this.ensurePlayerCanPlay(playerId);
        this.nextPlayer();
    }

    private ensurePlayerCanPlay(playerId: string): void {
        if (!this.findPlayer(playerId)) throw new Error('Player not in the game')
        if (this._state !== GameState.PLAYER) throw new Error('Must be in player phase')
        if (!this.isPlayerTurn(playerId)) throw new Error('Not player turn')
    }

    private isPlayerTurn(playerId: string): boolean {
        return this.currentPlayer.id === playerId;
    }

    private get currentPlayer(): Player {
        const player = this.players[this.currentPlayerIndex];
        if (!player) throw new Error('No current player');
        return player;
    }

    private nextPlayer(): void {
        this.currentPlayerIndex++

        this.skipOnBJ();
    }

    private skipOnBJ(): void {
        while (
            this.currentPlayerIndex < this.players.length &&
            this.getHandOrThrow(this.currentPlayer.id).isBlackjack
        ) this.currentPlayerIndex++;

        if (this.currentPlayerIndex >= this.players.length) {
            this._state = GameState.DEALER;
            this.dealerPlay();
        }
    }

    private dealerPlay(): void {
        if (this._state !== GameState.DEALER) throw new Error('Must be in dealer phase');

        while (this.dealerShallHit()) {
            this.dealerHand.add(this.deck.draw());
        }

        this._state = GameState.SETTLE;
        this.settle();
    }

    private dealerShallHit(): boolean {
        return this.dealerHand.score < this.gameConfig.dealerStandThreshold || (
            this.dealerHand.score === this.gameConfig.dealerStandThreshold &&
            this.dealerHand.isSoft &&
            this.gameConfig.dealerHitsOnSoft17
        )
    }

    settle(): void {
        if (this._state !== GameState.SETTLE) throw new Error('Must be in settle phase');

        for (const player of this.players) {
            const bet: number = this.getBetOrThrow(player.id);
            const outcome: Outcome = HandEvaluator.compare(this.getHandOrThrow(player.id), this.dealerHand);
            this.outcomes.set(player.id, outcome);
            switch (outcome) {
                case Outcome.BLACKJACK:
                    this.transaction(player, bet + bet * this.gameConfig.blackjackPayout);
                    break;
                case Outcome.WIN:
                    this.transaction(player, bet * 2);
                    break;
                case Outcome.PUSH:
                    this.transaction(player, bet);
                    break;
                default:
                    break;
            }
        }

        this._state = GameState.END;
    }

    private transaction(to: Player, amount: number): void {
        Casino.instance.debit(amount);
        try {
            to.credit(amount);
        } catch (error) {
            Casino.instance.credit(amount);
            throw new Error('Cannot complete the transaction');
        }
    }

    private getBetOrThrow(playerId: string): number {
        const bet = this.bets.get(playerId);
        if (bet === undefined) throw new Error('No bet for this player');
        return bet;
    }

    findOutcome(playerId: string): Outcome | undefined {
        return this.outcomes.get(playerId);
    }
}