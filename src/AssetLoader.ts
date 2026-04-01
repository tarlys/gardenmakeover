import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import ground2Url from '../assets/gltf/ground2.glb?url'
import objects2Url from '../assets/gltf/objects2.glb?url'
import coinUrl from '../assets/gltf/coin.glb?url'

import type { GltfAsset } from './types'

export const ASSET_URLS = {
  ground2: ground2Url,
  objects2: objects2Url,
  coin: coinUrl,
} as const

export class AssetLoader {
  private readonly gltfLoader = new GLTFLoader()

  loadGltf(url: string): Promise<GltfAsset> {
    return this.gltfLoader.loadAsync(url)
  }

  loadGround2(): Promise<GltfAsset> {
    return this.loadGltf(ASSET_URLS.ground2)
  }

  loadObjects2(): Promise<GltfAsset> {
    return this.loadGltf(ASSET_URLS.objects2)
  }

  loadCoin(): Promise<GltfAsset> {
    return this.loadGltf(ASSET_URLS.coin)
  }
}
