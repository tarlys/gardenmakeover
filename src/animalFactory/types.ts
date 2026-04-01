import type * as THREE from 'three'
import type gsap from 'gsap'

export type AnimalEntry = {
  root: THREE.Object3D
  mixer: THREE.AnimationMixer | null
  playAction: (() => void) | null
  idleAction: THREE.AnimationAction | null
  actionAction: THREE.AnimationAction | null
  progress: number
  progressSprite: THREE.Sprite
  progressTexture: THREE.CanvasTexture
  progressCtx: CanvasRenderingContext2D
  progressTween: gsap.core.Tween | null
  isHarvested: boolean
  cleanupCoinSpin: (() => void) | null
}

export type SpawnedCoin = {
  pivot: THREE.Group
  model: THREE.Object3D
  cleanupSpin: (() => void) | null
  collected: boolean
  amount: number
  sourceName: string
  hudCardName: string
}
