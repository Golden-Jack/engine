export class Casino {
    private static _instance: Casino | null = null;
    private bankroll: number;

    private constructor(bankroll: number) {
        if (bankroll < 0) throw new Error('Bankroll cannot be negative');
        this.bankroll = bankroll;
    }

    static get instance(): Casino {
        if (!this._instance) throw new Error('Casino not initialised');
        return this._instance;
    }

    static init(bankroll: number): Casino {
        if (this._instance) throw new Error('Casino already initialised');
        this._instance = new Casino(bankroll);
        return this._instance;
    }

    credit(amount: number): void {
        if (amount <= 0) throw new Error('Amount must be positive');
        this.bankroll += amount;
    }

    debit(amount: number): void {
        if (amount <= 0) throw new Error('Amount must be positive');
        if (!this.canCover(amount)) throw new Error('Casino cannot cover this amount');
        this.bankroll -= amount;
    }

    get isBankrupt(): boolean {
        return this.bankroll <= 0;
    }

    canCover(amount: number): boolean {
        return amount <= this.bankroll;
    }

    get balance(): number {
        return this.bankroll;
    }
}