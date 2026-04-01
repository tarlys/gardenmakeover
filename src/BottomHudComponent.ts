import * as THREE from 'three'

import { BottomHudController } from './bottomHud/BottomHudController'
import { BottomHudModel } from './bottomHud/BottomHudModel'
import { BottomHudView } from './bottomHud/BottomHudView'

export class BottomHudComponent {
  private readonly model: BottomHudModel
  private readonly view: BottomHudView
  private readonly controller: BottomHudController

  constructor(scene: THREE.Scene) {
    this.model = new BottomHudModel()
    this.view = new BottomHudView(scene)
    this.controller = new BottomHudController(this.model, this.view)
    this.controller.mount()
  }

  setAssets(sources: Record<string, THREE.Object3D>, animations: THREE.AnimationClip[]): void {
    this.controller.setAssets(sources, animations)
  }

  update(dt: number): void {
    this.controller.update(dt)
  }

  resize(width: number, height: number): void {
    this.controller.resize(width, height)
  }

  setHint(text: string): void {
    this.view.setHint(text)
  }

  setCardUnlocked(name: string, unlocked: boolean): void {
    this.controller.setCardUnlocked(name, unlocked)
  }

  handleClick(raycaster: THREE.Raycaster): string | null {
    return this.controller.handleClick(raycaster)
  }
}
