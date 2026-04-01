import type * as THREE from 'three'

import type { CoinCollectedHandler, PlacementConfig } from '../types'
import type { AnimalEntry, SpawnedCoin } from './types'

export class AnimalFactoryModel {
  readonly mixers: THREE.AnimationMixer[] = []
  coinTemplate: THREE.Object3D | null = null
  coinConfig: PlacementConfig = {}
  readonly animals: AnimalEntry[] = []
  readonly spawnedCoins: SpawnedCoin[] = []
  onCoinCollected: CoinCollectedHandler | null = null

  setCoinTemplate(root: THREE.Object3D, coinConfig: PlacementConfig = {}): void {
    this.coinTemplate = root
    this.coinConfig = coinConfig
  }

  setCoinCollectedHandler(handler: CoinCollectedHandler): void {
    this.onCoinCollected = handler
  }

  isAnimal(name: string): boolean {
    return name === 'cow_1' || name === 'chicken_1' || name === 'sheep_1'
  }

  getAnimalReward(name: string): number {
    if (name === 'chicken_1') return 10
    if (name === 'sheep_1') return 15
    if (name === 'cow_1') return 20
    return 10
  }
}
