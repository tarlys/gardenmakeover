import { HudModel } from './HudModel'
import { HudView } from './HudView'

export class HudController {
  constructor(
    private readonly model: HudModel,
    private readonly view: HudView
  ) {
    this.model.subscribe((balance) => this.view.render(balance))
  }

  addPoints(amount: number): void {
    this.model.addPoints(amount)
  }

  resize(width: number, height: number): void {
    this.view.resize(width, height)
  }

  showMessage(text: string): void {
    this.view.showMessage(text)
  }
}
