import * as THREE from 'three'

import { HudController } from './hud/HudController'
import { HudModel } from './hud/HudModel'
import { HudView } from './hud/HudView'

export class HudComponent {
  private readonly model: HudModel
  private readonly view: HudView
  private readonly controller: HudController

  constructor(scene: THREE.Scene, initialBalance = 0) {
    this.model = new HudModel(initialBalance)
    this.view = new HudView(scene)
    this.controller = new HudController(this.model, this.view)
  }

  addPoints(amount: number): void {
    this.controller.addPoints(amount)
  }

  getCollectTargetPosition(): THREE.Vector3 {
    return this.view.group.position.clone()
  }

  resize(width: number, height: number): void {
    this.controller.resize(width, height)
  }

  showMessage(text: string): void {
    this.controller.showMessage(text)
  }
}
