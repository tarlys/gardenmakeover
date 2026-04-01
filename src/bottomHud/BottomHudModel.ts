export class BottomHudModel {
  private readonly rows = [
    ['chicken_1', 'cow_1', 'sheep_1'],
    ['corn_3', 'grape_3', 'strawberry_3', 'tomato_3'],
  ]

  private readonly names = ['Chicken', 'Cow', 'Sheep', 'Corn', 'Grape', 'Strawberry', 'Tomato']

  getRows(): string[][] {
    return this.rows
  }

  getNames(): string[] {
    return this.names
  }

  getAllNames(): string[] {
    return this.rows.flat()
  }
}
