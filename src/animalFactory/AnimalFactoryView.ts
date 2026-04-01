import * as THREE from 'three'
import gsap from 'gsap'

import { startCoinSpinGsap } from '../coinSpinGsap'
import { AnimalFactoryModel } from './AnimalFactoryModel'
import type { AnimalEntry, SpawnedCoin } from './types'

export class AnimalFactoryView {
  constructor(
    private readonly scene: THREE.Scene,
    private readonly model: AnimalFactoryModel
  ) {}

  createAnimal(root: THREE.Object3D, animations: THREE.AnimationClip[]): AnimalEntry {
    const kind = root.name.replace(/_\d+$/, '')
    const idleClip = THREE.AnimationClip.findByName(animations, `idle_${kind}`)
    const actionClip = THREE.AnimationClip.findByName(animations, `action_${kind}`)

    let mixer: THREE.AnimationMixer | null = null
    let playAction: (() => void) | null = null
    let idleAction: THREE.AnimationAction | null = null
    let actionAction: THREE.AnimationAction | null = null

    if (idleClip && actionClip) {
      mixer = new THREE.AnimationMixer(root)
      idleAction = mixer.clipAction(idleClip)
      actionAction = mixer.clipAction(actionClip)

      idleAction.setLoop(THREE.LoopRepeat, Infinity)
      actionAction.setLoop(THREE.LoopRepeat, Infinity)
      idleAction.play()

      playAction = () => {
        idleAction?.stop()
        actionAction?.reset().play()
      }
    }

    const progress = this.createProgressSprite()
    progress.sprite.visible = false
    progress.sprite.position.y = this.getAnimalHeight(root) + 0.8
    root.add(progress.sprite)

    return {
      root,
      mixer,
      playAction,
      idleAction,
      actionAction,
      progress: 0,
      progressSprite: progress.sprite,
      progressTexture: progress.texture,
      progressCtx: progress.ctx,
      progressTween: null,
      isHarvested: false,
      cleanupCoinSpin: null,
    }
  }

  drawProgress(animal: AnimalEntry): void {
    if (!animal.progressSprite.visible) return

    const ctx = animal.progressCtx
    const width = 256
    const height = 64
    const inset = 8
    const innerWidth = width - inset * 2
    const innerHeight = height - inset * 2

    ctx.clearRect(0, 0, width, height)
    this.roundRect(ctx, inset, inset, innerWidth, innerHeight, 14)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fill()

    const fillWidth = Math.max(0, (innerWidth - 8) * animal.progress)
    if (fillWidth > 0) {
      this.roundRect(ctx, inset + 4, inset + 4, fillWidth, innerHeight - 8, 10)
      ctx.fillStyle = '#ffd54a'
      ctx.fill()
    }

    animal.progressTexture.needsUpdate = true
  }

  transitionToCoin(animal: AnimalEntry): void {
    const fromScale = animal.root.scale.clone()
    gsap.to(animal.root.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        animal.root.visible = false
        animal.progressSprite.visible = false
        animal.root.scale.copy(fromScale)
        this.replaceWithCoin(animal)
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
        sourceType: 'animal',
        sourceName: coin.sourceName,
        hudCardName: coin.hudCardName,
      })
      return
    }
    this.scene.remove(coin.pivot)
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
    sprite.name = 'animal_progress_sprite'
    sprite.userData.isFactoryProgressSprite = true
    sprite.scale.set(2.5, 0.6, 1)
    return { sprite, texture, ctx }
  }

  private getAnimalHeight(root: THREE.Object3D): number {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    return Math.max(1, box.max.y - box.min.y)
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

  private replaceWithCoin(animal: AnimalEntry): void {
    if (!this.model.coinTemplate) return

    animal.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(animal.root)
    const center = box.getCenter(new THREE.Vector3())
    const coinPivot = new THREE.Group()
    const coinModel = this.model.coinTemplate.clone(true)
    const cfg = this.model.coinConfig

    coinPivot.name = `${animal.root.name}_coin`
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
    animal.cleanupCoinSpin = startCoinSpinGsap(coinPivot, spinSpeed)
    this.model.spawnedCoins.push({
      pivot: coinPivot,
      model: coinModel,
      cleanupSpin: animal.cleanupCoinSpin,
      collected: false,
      amount: this.model.getAnimalReward(animal.root.name),
      sourceName: animal.root.name,
      hudCardName: animal.root.name,
    })
  }
}
