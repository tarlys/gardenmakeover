import * as THREE from 'three'
import gsap from 'gsap'

import { startCoinSpinGsap } from '../coinSpinGsap'
import { PlantFactoryModel } from './PlantFactoryModel'
import type { PlantGroup, PlantStage, SpawnedCoin } from './types'

export class PlantFactoryView {
  constructor(
    private readonly scene: THREE.Scene,
    private readonly model: PlantFactoryModel
  ) {}

  createProgressSprite(): {
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

  finalizeGroup(group: PlantGroup): void {
    group.stages.sort((a, b) => a.stage - b.stage)
    group.currentIndex = 0

    group.stages.forEach((entry, index) => {
      entry.root.visible = index === group.currentIndex
    })

    const current = group.stages[group.currentIndex]
    if (!current) return

    current.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(current.root)
    group.progressSprite.position.y = Math.max(1, box.max.y - box.min.y) + 0.8
    current.root.add(group.progressSprite)
  }

  drawProgress(group: PlantGroup): void {
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

  transitionPlantStage(group: PlantGroup, current: PlantStage, next: PlantStage): void {
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

  transitionPlantToCoin(group: PlantGroup, current: PlantStage): void {
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

  collectCoin(coin: SpawnedCoin): void {
    if (coin.collected) return
    coin.collected = true
    coin.cleanupSpin?.()
    if (this.model.onCoinCollected) {
      this.model.onCoinCollected({
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

  private spawnCoinForPlant(group: PlantGroup): void {
    if (!this.model.coinTemplate) return
    if (!['corn', 'grape', 'strawberry', 'tomato'].includes(group.key)) return

    const current = group.stages[group.currentIndex]
    if (!current) return

    current.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(current.root)
    const center = box.getCenter(new THREE.Vector3())
    const cfg = this.model.coinConfig

    const coinPivot = new THREE.Group()
    const coinModel = this.model.coinTemplate.clone(true)
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
    this.model.spawnedCoins.push({
      pivot: coinPivot,
      model: coinModel,
      cleanupSpin,
      collected: false,
      amount: 5,
      sourceName: group.key,
      hudCardName: `${group.key}_3`,
    })
  }
}
