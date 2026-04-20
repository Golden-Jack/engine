export interface EconomyConfig {
    initialBalance: number,
    minBet: number,
    maxBet?: number,
    houseBankroll: number,
    replenish?: {
        frequency: 'daily' | 'weekly' | 'monthly',
        amount: number,
        threshold: number
    }
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
    initialBalance: 1000,
    minBet: 1,
    houseBankroll: 1_000_000,
}