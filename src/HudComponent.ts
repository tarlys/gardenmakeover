import * as THREE from 'three'

import { HudController } from './hud/HudController'
import { HudModel } from './hud/HudModel'
import { HudView } from './hud/HudView'

export class HudComponent {
  private readonly model: HudModel
  private readonly view: HudView
  private readonly controller: HudController

  private constructor(model: HudModel, view: HudView, controller: HudController) {
    this.model = model
    this.view = view
    this.controller = controller
  }

  static async create(_scene: THREE.Scene, initialBalance = 0): Promise<HudComponent> {
    const model = new HudModel(initialBalance)
    const view = await HudView.create()
    const controller = new HudController(model, view)
    return new HudComponent(model, view, controller)
  }

  addPoints(amount: number): void {
    this.controller.addPoints(amount)
  }

  getCollectTargetPosition(): THREE.Vector3 {
    return this.view.collectTarget.clone()
  }

  resize(width: number, height: number): void {
    this.controller.resize(width, height)
  }

  showMessage(text: string): void {
    this.controller.showMessage(text)
  }
}
