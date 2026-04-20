import { Hand } from '../models/Hand';
import { Outcome } from './Oucome';

export class HandEvaluator {
    static compare(player: Hand, dealer: Hand): Outcome {
        if (player.isBust) return Outcome.BUST;
        if (player.isBlackjack && dealer.isBlackjack) return Outcome.PUSH;
        if (player.isBlackjack) return Outcome.BLACKJACK;
        if (dealer.isBlackjack) return Outcome.LOSS;
        if (dealer.isBust) return Outcome.WIN;

        if (player.score > dealer.score) {
            return Outcome.WIN;
        } else if (player.score < dealer.score) {
            return Outcome.LOSS;
        } else {
            return Outcome.PUSH;
        }
    }
}