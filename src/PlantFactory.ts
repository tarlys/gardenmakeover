import * as THREE from 'three'
import gsap from 'gsap'

import { startCoinSpinGsap } from './coinSpinGsap'
import type { CoinCollectedHandler, PlacementConfig } from './types'

type PlantStage = { root: THREE.Object3D; stage: number }

type PlantGroup = {
  key: string
  stages: PlantStage[]
  currentIndex: number
  progress: number
  progressSprite: THREE.Sprite
  progressTexture: THREE.CanvasTexture
  progressCtx: CanvasRenderingContext2D
  progressTween: gsap.core.Tween | null
  coinSpawned: boolean
}

type SpawnedCoin = {
  pivot: THREE.Group
  model: THREE.Object3D
  cleanupSpin: () => void
  collected: boolean
  amount: number
  sourceName: string
  hudCardName: string
}

export class PlantFactory {
  private readonly groups = new Map<string, PlantGroup>()
  private coinTemplate: THREE.Object3D | null = null
  private coinConfig: PlacementConfig = {}
  private readonly spawnedCoins: SpawnedCoin[] = []
  private onCoinCollected: CoinCollectedHandler | null = null

  constructor(private readonly scene: THREE.Scene) {}

  setCoinTemplate(root: THREE.Object3D, coinConfig: PlacementConfig = {}): void {
    this.coinTemplate = root
    this.coinConfig = coinConfig
  }

  setCoinCollectedHandler(handler: CoinCollectedHandler): void {
    this.onCoinCollected = handler
  }

  register(root: THREE.Object3D): void {
    const parsed = this.parsePlantName(root.name)
    if (!parsed) return

    let group = this.groups.get(parsed.key)
    if (!group) {
      const progress = this.createProgressSprite()
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
      this.groups.set(parsed.key, group)
    }

    group.stages.push({ root, stage: parsed.stage })
  }

  finalize(): void {
    for (const group of this.groups.values()) {
      group.stages.sort((a, b) => a.stage - b.stage)
      group.currentIndex = 0

      group.stages.forEach((entry, index) => {
        entry.root.visible = index === group.currentIndex
      })

      const current = group.stages[group.currentIndex]
      if (!current) continue

      current.root.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(current.root)
      group.progressSprite.position.y = Math.max(1, box.max.y - box.min.y) + 0.8
      current.root.add(group.progressSprite)
    }
  }

  update(): void {
    for (const group of this.groups.values()) {
      if (group.progressSprite.visible) {
        this.drawProgress(group)
      }
    }
  }

  handleClick(raycaster: THREE.Raycaster): void {
    for (const coin of this.spawnedCoins) {
      if (coin.collected || !coin.pivot.visible) continue
      const hits = raycaster.intersectObject(coin.pivot, true)
      if (hits.length > 0) {
        this.collectCoin(coin)
        return
      }
    }

    for (const group of this.groups.values()) {
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
    const group = this.groups.get(key)
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

  private parsePlantName(name: string): { key: string; stage: number } | null {
    const match = /^(corn|grape|strawberry|tomato)_(\d+)$/.exec(name)
    if (!match) return null
    return {
      key: match[1],
      stage: Number(match[2]),
    }
  }

  private createProgressSprite(): {
    sprite: THREE.Sprite
    texture: THREE.CanvasTexture
    ctx: CanvasRenderingContext2D
  } {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('2D canvas context is unavailable')
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      })
    )
    sprite.scale.set(2.5, 0.6, 1)
    return { sprite, texture, ctx }
  }

  private drawProgress(group: PlantGroup): void {
    const ctx = group.progressCtx
    const width = 256
    const height = 64
    const inset = 8
    const innerWidth = width - inset * 2
    const innerHeight = height - inset * 2

    ctx.clearRect(0, 0, width, height)
    this.roundRect(ctx, inset, inset, innerWidth, innerHeight, 14)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fill()

    const fillWidth = Math.max(0, (innerWidth - 8) * group.progress)
    if (fillWidth > 0) {
      this.roundRect(ctx, inset + 4, inset + 4, fillWidth, innerHeight - 8, 10)
      ctx.fillStyle = '#8df06f'
      ctx.fill()
    }

    group.progressTexture.needsUpdate = true
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + w, y, x + w, y + h, radius)
    ctx.arcTo(x + w, y + h, x, y + h, radius)
    ctx.arcTo(x, y + h, x, y, radius)
    ctx.arcTo(x, y, x + w, y, radius)
    ctx.closePath()
  }

  private startGrowth(group: PlantGroup): void {
    if (group.progressTween) return
    const current = group.stages[group.currentIndex]
    const next = group.stages[group.currentIndex + 1]
    if (!current) return
    const isFinalStage = group.currentIndex === group.stages.length - 1
    if (isFinalStage && group.coinSpawned) return
    if (!isFinalStage && !next) return

    group.progress = 0
    group.progressSprite.visible = true
    this.drawProgress(group)

    group.progressTween = gsap.to(group, {
      progress: 1,
      duration: 2,
      ease: 'none',
      onUpdate: () => {
        this.drawProgress(group)
      },
      onComplete: () => {
        group.progressTween = null
        group.progressSprite.visible = false
        group.progress = 0
        if (isFinalStage) {
          this.transitionPlantToCoin(group, current)
          return
        }
        if (next) {
          this.transitionPlantStage(group, current, next)
        }
      },
    })
  }

  private transitionPlantStage(group: PlantGroup, current: PlantStage, next: PlantStage): void {
    const currentScale = current.root.scale.clone()
    const nextScale = next.root.scale.clone()
    gsap.to(current.root.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        current.root.remove(group.progressSprite)
        current.root.visible = false
        current.root.scale.copy(currentScale)
        group.currentIndex += 1
        next.root.visible = true
        next.root.scale.setScalar(0)
        next.root.add(group.progressSprite)
        gsap.to(next.root.scale, {
          x: nextScale.x,
          y: nextScale.y,
          z: nextScale.z,
          duration: 0.25,
          ease: 'back.out(1.4)',
        })
      },
    })
  }

  private transitionPlantToCoin(group: PlantGroup, current: PlantStage): void {
    const currentScale = current.root.scale.clone()
    gsap.to(current.root.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        current.root.remove(group.progressSprite)
        current.root.visible = false
        current.root.scale.copy(currentScale)
        group.coinSpawned = true
        this.spawnCoinForPlant(group)
      },
    })
  }

  private spawnCoinForPlant(group: PlantGroup): void {
    if (!this.coinTemplate) return
    if (!['corn', 'grape', 'strawberry', 'tomato'].includes(group.key)) return

    const current = group.stages[group.currentIndex]
    if (!current) return

    current.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(current.root)
    const center = box.getCenter(new THREE.Vector3())
    const cfg = this.coinConfig

    const coinPivot = new THREE.Group()
    const coinModel = this.coinTemplate.clone(true)
    coinPivot.name = `${group.key}_coin`
    coinPivot.position.set(center.x, box.min.y + 1, center.z)
    coinModel.rotation.set(cfg.rotationX ?? 0, cfg.rotationY ?? Math.PI, cfg.rotationZ ?? 0)
    coinModel.scale.setScalar(2)
    const targetScale = coinModel.scale.clone()
    coinModel.scale.setScalar(0)
    coinPivot.add(coinModel)
    this.scene.add(coinPivot)
    gsap.to(coinModel.scale, {
      x: targetScale.x,
      y: targetScale.y,
      z: targetScale.z,
      duration: 0.25,
      ease: 'back.out(1.4)',
    })

    const spinSpeed = cfg.spinSpeed ?? 1.5
    const cleanupSpin = startCoinSpinGsap(coinPivot, spinSpeed)
    this.spawnedCoins.push({
      pivot: coinPivot,
      model: coinModel,
      cleanupSpin,
      collected: false,
      amount: 5,
      sourceName: group.key,
      hudCardName: `${group.key}_3`,
    })
  }

  private collectCoin(coin: SpawnedCoin): void {
    if (coin.collected) return
    coin.collected = true
    coin.cleanupSpin?.()
    if (this.onCoinCollected) {
      this.onCoinCollected({
        pivot: coin.pivot,
        model: coin.model,
        amount: coin.amount,
        sourceType: 'plant',
        sourceName: coin.sourceName,
        hudCardName: coin.hudCardName,
      })
      return
    }
    this.scene.remove(coin.pivot)
  }
}
