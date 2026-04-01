import * as THREE from 'three'
import gsap from 'gsap'

import { PlantFactoryModel } from './PlantFactoryModel'
import { PlantFactoryView } from './PlantFactoryView'

export class PlantFactoryController {
  constructor(
    private readonly model: PlantFactoryModel,
    private readonly view: PlantFactoryView
  ) {}

  setCoinTemplate(root: THREE.Object3D, coinConfig = {}): void {
    this.model.setCoinTemplate(root, coinConfig)
  }

  setCoinCollectedHandler(handler: Parameters<PlantFactoryModel['setCoinCollectedHandler']>[0]): void {
    this.model.setCoinCollectedHandler(handler)
  }

  register(root: THREE.Object3D): void {
    const parsed = this.model.parsePlantName(root.name)
    if (!parsed) return

    let group = this.model.groups.get(parsed.key)
    if (!group) {
      const progress = this.view.createProgressSprite()
      progress.sprite.visible = false
      group = {
        key: parsed.key,
        stages: [],
        currentIndex: 0,
        progress: 0,
        progressSprite: progress.sprite,
        progressTexture: progress.texture,
        progressCtx: progress.ctx,
        progressTween: null,
        coinSpawned: false,
      }
      this.model.groups.set(parsed.key, group)
    }

    group.stages.push({ root, stage: parsed.stage })
  }

  finalize(): void {
    for (const group of this.model.groups.values()) {
      this.view.finalizeGroup(group)
    }
  }

  update(): void {
    for (const group of this.model.groups.values()) {
      if (group.progressSprite.visible) {
        this.view.drawProgress(group)
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

    for (const group of this.model.groups.values()) {
      const current = group.stages[group.currentIndex]
      if (!current || !current.root.visible) continue
      const hits = raycaster.intersectObject(current.root, true)
      if (hits.length > 0) {
        this.startGrowth(group)
        return
      }
    }
  }

  restoreByKey(key: string): boolean {
    const group = this.model.groups.get(key)
    if (!group || !group.coinSpawned) return false

    group.progressTween?.kill()
    group.progressTween = null
    group.progress = 0
    group.coinSpawned = false
    group.currentIndex = 0
    group.progressSprite.visible = false
    group.progressSprite.parent?.remove(group.progressSprite)

    group.stages.forEach((entry, index) => {
      entry.root.visible = index === 0
    })

    const firstStage = group.stages[0]
    if (!firstStage) return false
    firstStage.root.add(group.progressSprite)
    return true
  }

  private startGrowth(group: (typeof this.model.groups extends Map<string, infer T> ? T : never)): void {
    if (group.progressTween) return
    const current = group.stages[group.currentIndex]
    const next = group.stages[group.currentIndex + 1]
    if (!current) return
    const isFinalStage = group.currentIndex === group.stages.length - 1
    if (isFinalStage && group.coinSpawned) return
    if (!isFinalStage && !next) return

    group.progress = 0
    group.progressSprite.visible = true
    this.view.drawProgress(group)

    group.progressTween = gsap.to(group, {
      progress: 1,
      duration: 2,
      ease: 'none',
      onUpdate: () => {
        this.view.drawProgress(group)
      },
      onComplete: () => {
        group.progressTween = null
        group.progressSprite.visible = false
        group.progress = 0
        if (isFinalStage) {
          this.view.transitionPlantToCoin(group, current)
          return
        }
        if (next) {
          this.view.transitionPlantStage(group, current, next)
        }
      },
    })
  }
}
