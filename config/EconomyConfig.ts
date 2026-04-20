export interface EconomyConfig {
    initialBalance: number,
    minBet: number,
    maxBet?: number,
    bankroll: number,
    replenish?: {
        frequency: 'daily' | 'weekly' | 'monthly',
        amount: number,
        threshold: number
    }
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
    initialBalance: 1000,
    minBet: 1,
    bankroll: 1_000_000,
}