import * as THREE from 'three'
import gsap from 'gsap'

import { AnimalFactoryModel } from './AnimalFactoryModel'
import { AnimalFactoryView } from './AnimalFactoryView'

export class AnimalFactoryController {
  constructor(
    private readonly model: AnimalFactoryModel,
    private readonly view: AnimalFactoryView
  ) {}

  setCoinTemplate(root: THREE.Object3D, coinConfig = {}): void {
    this.model.setCoinTemplate(root, coinConfig)
  }

  setCoinCollectedHandler(handler: Parameters<AnimalFactoryModel['setCoinCollectedHandler']>[0]): void {
    this.model.setCoinCollectedHandler(handler)
  }

  register(root: THREE.Object3D, animations: THREE.AnimationClip[]): void {
    if (!this.model.isAnimal(root.name)) return
    const animal = this.view.createAnimal(root, animations)
    this.model.animals.push(animal)
    if (animal.mixer) {
      this.model.mixers.push(animal.mixer)
    }
  }

  update(dt: number): void {
    for (const mixer of this.model.mixers) {
      mixer.update(dt)
    }
    for (const animal of this.model.animals) {
      if (!animal.isHarvested) {
        this.view.drawProgress(animal)
      }
    }
  }

  handleClick(raycaster: THREE.Raycaster): void {
    for (const coin of this.model.spawnedCoins) {
      if (coin.collected || !coin.pivot.visible) continue
      const hits = raycaster.intersectObject(coin.pivot, true)
      if (hits.length > 0) {
        this.view.collectCoin(coin)
        return
      }
    }

    for (const animal of this.model.animals) {
      if (!animal.root.visible || animal.isHarvested) continue
      const hits = raycaster.intersectObject(animal.root, true)
      if (hits.length > 0) {
        this.startHarvest(animal)
        return
      }
    }
  }

  restoreByName(name: string): boolean {
    const animal = this.model.animals.find((entry) => entry.root.name === name)
    if (!animal || !animal.isHarvested) return false

    animal.progressTween?.kill()
    animal.progressTween = null
    animal.progress = 0
    animal.progressSprite.visible = false
    animal.root.visible = true
    animal.isHarvested = false
    animal.idleAction?.reset().play()
    animal.actionAction?.stop()
    return true
  }

  private startHarvest(animal: (typeof this.model.animals)[number]): void {
    if (animal.progressTween || animal.isHarvested) return
    animal.playAction?.()
    animal.progress = 0
    animal.progressSprite.visible = true
    this.view.drawProgress(animal)

    animal.progressTween = gsap.to(animal, {
      progress: 1,
      duration: 4,
      ease: 'none',
      onUpdate: () => {
        this.view.drawProgress(animal)
      },
      onComplete: () => {
        animal.progressTween = null
        animal.isHarvested = true
        this.view.transitionToCoin(animal)
      },
    })
  }
}
