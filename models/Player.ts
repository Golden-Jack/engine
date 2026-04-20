export class Player {
    constructor(
        readonly id: string,
        public readonly username: string,
        private _balance: number
    ) {}

    get displayName(): string {
        return this.username;
    }

    get balance(): number {
        return this._balance;
    }

    credit(amount: number): void {
        if (amount <= 0) throw new Error('Amount must be positive');
        this._balance += amount;
    }

    debit(amount: number): void {
        if (amount <= 0) throw new Error('Amount must be positive');
        if (this._balance < amount) throw new Error('Insufficient balance');
        this._balance -= amount;
    }
}