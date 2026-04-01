import * as THREE from 'three'

import { PlantFactoryController } from './plantFactory/PlantFactoryController'
import { PlantFactoryModel } from './plantFactory/PlantFactoryModel'
import { PlantFactoryView } from './plantFactory/PlantFactoryView'
import type { CoinCollectedHandler, PlacementConfig } from './types'

export class PlantFactory {
  private readonly model: PlantFactoryModel
  private readonly view: PlantFactoryView
  private readonly controller: PlantFactoryController

  constructor(scene: THREE.Scene) {
    this.model = new PlantFactoryModel()
    this.view = new PlantFactoryView(scene, this.model)
    this.controller = new PlantFactoryController(this.model, this.view)
  }

  setCoinTemplate(root: THREE.Object3D, coinConfig: PlacementConfig = {}): void {
    this.controller.setCoinTemplate(root, coinConfig)
  }

  setCoinCollectedHandler(handler: CoinCollectedHandler): void {
    this.controller.setCoinCollectedHandler(handler)
  }

  register(root: THREE.Object3D): void {
    this.controller.register(root)
  }

  finalize(): void {
    this.controller.finalize()
  }

  update(): void {
    this.controller.update()
  }

  handleClick(raycaster: THREE.Raycaster): void {
    this.controller.handleClick(raycaster)
  }

  restoreByKey(key: string): boolean {
    return this.controller.restoreByKey(key)
  }
}
