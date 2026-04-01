import type * as THREE from 'three'

import type { CoinCollectedHandler, PlacementConfig } from '../types'
import type { PlantGroup } from './types'

export class PlantFactoryModel {
  readonly groups = new Map<string, PlantGroup>()
  coinTemplate: THREE.Object3D | null = null
  coinConfig: PlacementConfig = {}
  readonly spawnedCoins: import('./types').SpawnedCoin[] = []
  onCoinCollected: CoinCollectedHandler | null = null

  setCoinTemplate(root: THREE.Object3D, coinConfig: PlacementConfig = {}): void {
    this.coinTemplate = root
    this.coinConfig = coinConfig
  }

  setCoinCollectedHandler(handler: CoinCollectedHandler): void {
    this.onCoinCollected = handler
  }

  parsePlantName(name: string): { key: string; stage: number } | null {
    const match = /^(corn|grape|strawberry|tomato)_(\d+)$/.exec(name)
    if (!match) return null
    return {
      key: match[1],
      stage: Number(match[2]),
    }
  }
}
