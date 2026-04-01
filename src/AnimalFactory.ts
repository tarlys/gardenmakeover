import * as THREE from 'three'

import { AnimalFactoryController } from './animalFactory/AnimalFactoryController'
import { AnimalFactoryModel } from './animalFactory/AnimalFactoryModel'
import { AnimalFactoryView } from './animalFactory/AnimalFactoryView'
import type { CoinCollectedHandler, PlacementConfig } from './types'

export class AnimalFactory {
  private readonly model: AnimalFactoryModel
  private readonly view: AnimalFactoryView
  private readonly controller: AnimalFactoryController

  constructor(scene: THREE.Scene) {
    this.model = new AnimalFactoryModel()
    this.view = new AnimalFactoryView(scene, this.model)
    this.controller = new AnimalFactoryController(this.model, this.view)
  }

  setCoinTemplate(root: THREE.Object3D, coinConfig: PlacementConfig = {}): void {
    this.controller.setCoinTemplate(root, coinConfig)
  }

  setCoinCollectedHandler(handler: CoinCollectedHandler): void {
    this.controller.setCoinCollectedHandler(handler)
  }

  register(root: THREE.Object3D, animations: THREE.AnimationClip[]): void {
    this.controller.register(root, animations)
  }

  update(dt: number): void {
    this.controller.update(dt)
  }

  handleClick(raycaster: THREE.Raycaster): void {
    this.controller.handleClick(raycaster)
  }

  restoreByName(name: string): boolean {
    return this.controller.restoreByName(name)
  }
}
