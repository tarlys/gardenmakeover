import type * as THREE from 'three'
import type gsap from 'gsap'

export type PlantStage = { root: THREE.Object3D; stage: number }

export type PlantGroup = {
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

export type SpawnedCoin = {
  pivot: THREE.Group
  model: THREE.Object3D
  cleanupSpin: () => void
  collected: boolean
  amount: number
  sourceName: string
  hudCardName: string
}
