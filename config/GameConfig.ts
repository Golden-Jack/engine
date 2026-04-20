export interface GameConfig {
    numberOfDecks: number,
    blackjackPayout: number,
    shuffleThreshold: number,
    dealerHitsOnSoft17: boolean,
    dealCardsNumber: number,
    maxGamePlayers: number,
    authorizeHitOnBJ: boolean
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
    numberOfDecks: 6,
    blackjackPayout: 3/2,
    shuffleThreshold: 25/100,
    dealerHitsOnSoft17: false,
    dealCardsNumber: 2,
    maxGamePlayers: 7,
    authorizeHitOnBJ: false
}