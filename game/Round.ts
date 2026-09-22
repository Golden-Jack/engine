import type { GameConfig } from '../config/GameConfig';
import type { EconomyConfig } from '../config/EconomyConfig';

import type { Deck } from '../models/Deck';
import { Hand } from '../models/Hand';
import { Player } from '../models/Player';
import { GameState } from './GameState';
import { Casino } from './Casino';
import { Outcome } from './Outcome';
import { HandEvaluator } from './HandEvaluator';

interface PlayerHandState {
    hand: Hand;
    bet: number;
    fromSplit: boolean;
    outcome?: Outcome;
}

export class Round {
    private _state: GameState = GameState.BET;
    private readonly playerHands: Map<string, PlayerHandState[]>;
    readonly dealerHand: Hand;
    private currentPlayerIndex: number = 0;
    private currentHandIndex: number = 0;

    constructor(
        private readonly players: Player[],
        private readonly deck: Deck,
        private readonly gameConfig: GameConfig,
        private readonly economyConfig: EconomyConfig
    ) {
        if (players.length === 0) throw new Error('A round needs at least one player to start');

        this.dealerHand = new Hand(gameConfig);
        this.playerHands = new Map<string, PlayerHandState[]>();
        for (const player of players) {
            this.playerHands.set(player.id, [{ hand: new Hand(gameConfig), bet: 0, fromSplit: false }]);
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

        const hands = this.getPlayerHandsOrThrow(playerId);
        if (hands[0]!.bet > 0) throw new Error('Player has already bet');
        if (amount < this.economyConfig.minBet) throw new Error('Bet too low');
        if (this.economyConfig.maxBet && amount > this.economyConfig.maxBet) throw new Error('Bet too high');
        if (!Casino.instance.canCover(amount * this.gameConfig.blackjackPayout)) throw new Error('Casino cannot cover this bet');

        player.debit(amount);
        Casino.instance.credit(amount);
        hands[0]!.bet = amount;

        if (this.players.every(p => this.getPlayerHandsOrThrow(p.id)[0]!.bet > 0)) {
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
                this.getPlayerHandsOrThrow(player.id)[0]!.hand.add(this.deck.draw());
            }
            this.dealerHand.add(this.deck.draw());
        }

        this._state = GameState.PLAYER;
        this.currentPlayerIndex = 0;
        this.currentHandIndex = 0;
        this.skipResolvedHands();
    }

    /** Nombre de mains d'un joueur (>1 après un split). */
    handCount(playerId: string): number {
        return this.getPlayerHandsOrThrow(playerId).length;
    }

    findHand(playerId: string, handIndex: number = 0): Hand | undefined {
        return this.playerHands.get(playerId)?.[handIndex]?.hand;
    }

    getBet(playerId: string, handIndex: number = 0): number | undefined {
        return this.playerHands.get(playerId)?.[handIndex]?.bet;
    }

    isFromSplit(playerId: string, handIndex: number = 0): boolean {
        return this.playerHands.get(playerId)?.[handIndex]?.fromSplit ?? false;
    }

    private getPlayerHandsOrThrow(playerId: string): PlayerHandState[] {
        const hands = this.playerHands.get(playerId);
        if (!hands) throw new Error('No hand for this player');
        return hands;
    }

    hit(playerId: string): void {
        const state = this.ensurePlayerCanPlay(playerId);
        state.hand.add(this.deck.draw());

        if (this.isHandResolved(state)) this.advance();
    }

    stand(playerId: string): void {
        this.ensurePlayerCanPlay(playerId);
        this.advance();
    }

    double(playerId: string): void {
        const state = this.ensurePlayerCanPlay(playerId);
        if (state.hand.size !== 2) throw new Error('Can only double on the initial two cards');
        if (state.fromSplit && !this.gameConfig.allowDoubleAfterSplit) throw new Error('Cannot double after a split');
        if (this.gameConfig.doubleOnly.length > 0 && !this.gameConfig.doubleOnly.includes(state.hand.score)) {
            throw new Error(`Can only double on a total of ${this.gameConfig.doubleOnly.join(', ')}`);
        }

        const player = this.findPlayer(playerId)!;
        if (player.balance < state.bet) throw new Error('Insufficient balance to double');
        if (!Casino.instance.canCover(state.bet)) throw new Error('Casino cannot cover this double');

        player.debit(state.bet);
        Casino.instance.credit(state.bet);
        state.bet *= 2;

        state.hand.add(this.deck.draw());
        this.advance();
    }

    split(playerId: string): void {
        const state = this.ensurePlayerCanPlay(playerId);
        const hands = this.getPlayerHandsOrThrow(playerId);

        if (hands.length >= this.gameConfig.maxSplitHands) throw new Error('Maximum number of split hands reached');
        if (state.hand.size !== 2) throw new Error('Can only split on the initial two cards');

        const [first, second] = state.hand.cards;
        if (!first || !second || first.rank !== second.rank) throw new Error('Cards must match to split');

        const player = this.findPlayer(playerId)!;
        if (player.balance < state.bet) throw new Error('Insufficient balance to split');
        if (!Casino.instance.canCover(state.bet * this.gameConfig.blackjackPayout)) throw new Error('Casino cannot cover this split');

        player.debit(state.bet);
        Casino.instance.credit(state.bet);

        // Hand n'exposant pas de retrait de carte : on reconstruit la main gardée
        // et on crée la nouvelle main à partir de la seconde carte.
        const keptHand = new Hand(this.gameConfig);
        keptHand.add(first);
        state.hand = keptHand;
        state.fromSplit = true;

        const newState: PlayerHandState = { hand: new Hand(this.gameConfig), bet: state.bet, fromSplit: true };
        newState.hand.add(second);

        hands.splice(this.currentHandIndex + 1, 0, newState);

        state.hand.add(this.deck.draw());
        newState.hand.add(this.deck.draw());

        this.skipResolvedHands();
    }

    private ensurePlayerCanPlay(playerId: string): PlayerHandState {
        if (!this.findPlayer(playerId)) throw new Error('Player not in the game');
        if (this._state !== GameState.PLAYER) throw new Error('Must be in player phase');
        if (!this.isPlayerTurn(playerId)) throw new Error('Not player turn');
        return this.currentHandState;
    }

    private get currentHandState(): PlayerHandState {
        const hands = this.getPlayerHandsOrThrow(this.currentPlayer.id);
        const state = hands[this.currentHandIndex];
        if (!state) throw new Error('No current hand');
        return state;
    }

    private isPlayerTurn(playerId: string): boolean {
        return this.currentPlayer.id === playerId;
    }

    private get currentPlayer(): Player {
        const player = this.players[this.currentPlayerIndex];
        if (!player) throw new Error('No current player');
        return player;
    }

    private isHandResolved(state: PlayerHandState): boolean {
        return state.hand.isBust || state.hand.score === this.gameConfig.bustThreshold;
    }

    private advance(): void {
        this.currentHandIndex++;
        this.skipResolvedHands();
    }

    private skipResolvedHands(): void {
        while (this.currentPlayerIndex < this.players.length) {
            const player = this.players[this.currentPlayerIndex]!;
            const hands = this.getPlayerHandsOrThrow(player.id);

            if (this.currentHandIndex >= hands.length) {
                this.currentPlayerIndex++;
                this.currentHandIndex = 0;
                continue;
            }

            if (this.isHandResolved(hands[this.currentHandIndex]!)) {
                this.currentHandIndex++;
                continue;
            }

            return;
        }

        this._state = GameState.DEALER;
        this.dealerPlay();
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
            for (const state of this.getPlayerHandsOrThrow(player.id)) {
                let outcome: Outcome = HandEvaluator.compare(state.hand, this.dealerHand);
                // Un 21 obtenu après split n'est pas un blackjack naturel (pas de payout 3:2).
                if (outcome === Outcome.BLACKJACK && state.fromSplit) outcome = Outcome.WIN;

                state.outcome = outcome;
                this.transaction(player, state.bet + this.diff(outcome, state.bet));
            }
        }

        this._state = GameState.END;
    }

    diff(outcome: Outcome, bet: number): number {
        switch (outcome) {
            case Outcome.BLACKJACK: return bet * this.gameConfig.blackjackPayout;
            case Outcome.WIN: return bet;
            case Outcome.PUSH: return 0;
            default: return -bet;
        }
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

    findOutcome(playerId: string, handIndex: number = 0): Outcome | undefined {
        return this.playerHands.get(playerId)?.[handIndex]?.outcome;
    }
}