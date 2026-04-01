import type * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type PlacementConfig = {
  x?: number
  y?: number
  z?: number
  yOffset?: number
  visible?: boolean
  rotationX?: number
  rotationY?: number
  rotationZ?: number
  spinSpeed?: number
}

export type ObjectsPlacementConfig = {
  byIndex: PlacementConfig[]
  byName: Record<string, PlacementConfig>
  extraFence: PlacementConfig
  coin: PlacementConfig
}

export type CoinCollectedPayload = {
  pivot: THREE.Object3D
  model: THREE.Object3D
  amount: number
  sourceType: 'animal' | 'plant'
  sourceName?: string
  hudCardName?: string
}

export type CoinCollectedHandler = (payload: CoinCollectedPayload) => void

export type GltfAsset = GLTF
