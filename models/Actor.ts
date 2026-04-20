export abstract class Actor {
  constructor(public readonly id: string) {}
  abstract get displayName(): string;
}