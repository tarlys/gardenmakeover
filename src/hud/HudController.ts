import { HudModel } from './HudModel'
import { HudView } from './HudView'

export class HudController {
  private onToggleLighting: (() => void) | null = null

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

  setToggleLabel(text: string): void {
    this.view.setToggleLabel(text)
  }

  setToggleLightingHandler(handler: () => void): void {
    this.onToggleLighting = handler
  }

  handlePointerDown(clientX: number, clientY: number): boolean {
    if (!this.view.isToggleHit(clientX, clientY)) return false
    this.onToggleLighting?.()
    return true
  }

  addDomClickListener(listener: (event: MouseEvent) => void): void {
    this.view.addDomClickListener(listener)
  }
}
