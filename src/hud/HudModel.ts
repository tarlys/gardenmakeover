export class HudModel {
  private balance: number
  private readonly listeners = new Set<(balance: number) => void>()

  constructor(initialBalance = 0) {
    this.balance = initialBalance
  }

  subscribe(listener: (balance: number) => void): () => void {
    this.listeners.add(listener)
    listener(this.balance)
    return () => this.listeners.delete(listener)
  }

  addPoints(amount: number): void {
    this.balance += amount
    for (const listener of this.listeners) {
      listener(this.balance)
    }
  }
}
