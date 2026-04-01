import * as THREE from 'three'

import { AssetLoader } from './AssetLoader'
import type { WorldBuildResult, ObjectsPlacementConfig, PlacementConfig } from './types'
import type { AnimalFactory } from './AnimalFactory'
import type { PlantFactory } from './PlantFactory'
import type { BottomHudComponent } from './BottomHudComponent'
import type { CameraManager } from './CameraManager'

type WorldBuilderOptions = {
  scene: THREE.Scene
  assetLoader: AssetLoader
  animalFactory: AnimalFactory
  plantFactory: PlantFactory
  bottomHud: BottomHudComponent
  cameraManager: CameraManager
  placementConfig: ObjectsPlacementConfig
  raycaster: THREE.Raycaster
  rayDown: THREE.Vector3
  tmpV: THREE.Vector3
}

export class WorldBuilder {
  private readonly scene: THREE.Scene
  private readonly assetLoader: AssetLoader
  private readonly animalFactory: AnimalFactory
  private readonly plantFactory: PlantFactory
  private readonly bottomHud: BottomHudComponent
  private readonly cameraManager: CameraManager
  private readonly placementConfig: ObjectsPlacementConfig
  private readonly raycaster: THREE.Raycaster
  private readonly rayDown: THREE.Vector3
  private readonly tmpV: THREE.Vector3

  constructor(options: WorldBuilderOptions) {
    this.scene = options.scene
    this.assetLoader = options.assetLoader
    this.animalFactory = options.animalFactory
    this.plantFactory = options.plantFactory
    this.bottomHud = options.bottomHud
    this.cameraManager = options.cameraManager
    this.placementConfig = options.placementConfig
    this.raycaster = options.raycaster
    this.rayDown = options.rayDown
    this.tmpV = options.tmpV
  }

  async build(): Promise<WorldBuildResult> {
    const groundGltf = await this.assetLoader.loadGround2()
    const groundRoot = groundGltf.scene
    this.scene.add(groundRoot)
    this.centerGround(groundRoot)

    groundRoot.updateMatrixWorld(true)
    const groundBox = new THREE.Box3().setFromObject(groundRoot)
    const pad = 0.4
    const minX = groundBox.min.x + pad
    const maxX = groundBox.max.x - pad
    const minZ = groundBox.min.z + pad
    const maxZ = groundBox.max.z - pad

    const objectsGltf = await this.assetLoader.loadObjects2()
    const placables = this.extractPlacables(objectsGltf.scene)
    const sheepRoot = placables.find((obj) => obj.name === 'sheep_1') ?? null
    const cornRoot = placables.find((obj) => obj.name === 'corn_1') ?? null
    const cowRoot = placables.find((obj) => obj.name === 'cow_1') ?? null

    const n = placables.length
    const autoPositions = this.buildAutoPositions(n, minX, maxX, minZ, maxZ)
    const centerFallback = {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    }

    if (n === 0) {
      console.warn('objects2.glb: нет отдельных узлов для расстановки')
    }

    placables.forEach((obj, i) => {
      this.scene.add(obj)
      const placement = this.resolvePlacement(obj, i)
      const fallback = autoPositions[i] ?? centerFallback
      this.applyPlacement(obj, groundRoot, placement, fallback)
      this.applyVisibility(obj, placement)
      this.animalFactory.register(obj, objectsGltf.animations)
      this.plantFactory.register(obj)
    })

    const fenceSource = placables.find((obj) => obj.name === 'fence')
    if (fenceSource) {
      const extraFence = fenceSource.clone(true)
      const extraFencePlacement = this.placementConfig.extraFence ?? { x: -11.5, z: 8 }
      this.scene.add(extraFence)
      this.applyPlacement(extraFence, groundRoot, extraFencePlacement, centerFallback)
      this.applyVisibility(extraFence, extraFencePlacement)
      extraFence.rotation.y =
        typeof extraFencePlacement.rotationY === 'number' ? extraFencePlacement.rotationY : Math.PI
    }

    this.plantFactory.finalize()
    this.bottomHud.setAssets(
      Object.fromEntries(placables.map((obj) => [obj.name, obj])) as Record<string, THREE.Object3D>,
      objectsGltf.animations
    )

    const coinGltf = await this.assetLoader.loadCoin()
    const coinModel = coinGltf.scene
    const coinPlacement = this.placementConfig.coin
    coinModel.rotation.set(coinPlacement.rotationX ?? 0, coinPlacement.rotationY ?? Math.PI, coinPlacement.rotationZ ?? 0)
    this.animalFactory.setCoinTemplate(coinModel, coinPlacement)
    this.plantFactory.setCoinTemplate(coinModel, coinPlacement)

    this.cameraManager.frameGround(groundRoot)

    return {
      groundRoot,
      sheepRoot,
      cornRoot,
      cowRoot,
    }
  }

  private centerGround(root: THREE.Object3D): void {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const center = box.getCenter(new THREE.Vector3())
    root.position.x -= center.x
    root.position.z -= center.z
    root.position.y -= box.min.y
  }

  private extractPlacables(root: THREE.Object3D): THREE.Object3D[] {
    let nodes = [...root.children]
    while (nodes.length === 1 && nodes[0] instanceof THREE.Group) {
      const inner = nodes[0]
      root.remove(inner)
      nodes = [...inner.children]
    }
    const out: THREE.Object3D[] = []
    for (const n of nodes) {
      n.parent?.remove(n)
      out.push(n)
    }
    return out
  }

  private heightOnGround(groundRoot: THREE.Object3D, x: number, z: number, rayTop = 800): number {
    this.tmpV.set(x, rayTop, z)
    this.raycaster.set(this.tmpV, this.rayDown)
    const hits = this.raycaster.intersectObject(groundRoot, true)
    return hits.length ? hits[0].point.y : 0
  }

  private placeOnTerrain(obj: THREE.Object3D, groundRoot: THREE.Object3D, x: number, z: number): void {
    obj.position.set(0, 0, 0)
    obj.updateMatrixWorld(true)
    let box = new THREE.Box3().setFromObject(obj)
    const cx = box.getCenter(new THREE.Vector3()).x
    const cz = box.getCenter(new THREE.Vector3()).z
    obj.position.x = x - cx
    obj.position.z = z - cz
    obj.updateMatrixWorld(true)
    box = new THREE.Box3().setFromObject(obj)
    const gx = (box.min.x + box.max.x) / 2
    const gz = (box.min.z + box.max.z) / 2
    const ySurf = this.heightOnGround(groundRoot, gx, gz)
    obj.position.y += ySurf - box.min.y
  }

  private applyPlacement(
    obj: THREE.Object3D,
    groundRoot: THREE.Object3D,
    placement: PlacementConfig | null,
    fallback: { x: number; z: number }
  ): void {
    if (!placement) {
      this.placeOnTerrain(obj, groundRoot, fallback.x, fallback.z)
      return
    }

    const hasX = typeof placement.x === 'number'
    const hasY = typeof placement.y === 'number'
    const hasZ = typeof placement.z === 'number'

    if (hasX && hasY && hasZ) {
      obj.position.set(placement.x!, placement.y!, placement.z!)
      return
    }

    const x = hasX ? placement.x! : fallback.x
    const z = hasZ ? placement.z! : fallback.z
    this.placeOnTerrain(obj, groundRoot, x, z)
    if (typeof placement.yOffset === 'number') {
      obj.position.y += placement.yOffset
    }
  }

  private applyVisibility(obj: THREE.Object3D, placement: PlacementConfig | null): void {
    if (!placement || placement.visible === undefined) {
      obj.visible = true
      return
    }
    obj.visible = Boolean(placement.visible)
  }

  private resolvePlacement(obj: THREE.Object3D, index: number): PlacementConfig | null {
    const name = obj.name
    if (name && this.placementConfig.byName[name] !== undefined) {
      return this.placementConfig.byName[name]
    }
    if (this.placementConfig.byIndex[index] !== undefined) {
      return this.placementConfig.byIndex[index]
    }
    return null
  }

  private buildAutoPositions(
    n: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number
  ): Array<{ x: number; z: number }> {
    const positions: Array<{ x: number; z: number }> = []
    if (n === 0) return positions
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0.5
      const u = (i * 0.6180339887) % 1
      const x = minX + (0.25 + 0.5 * t + 0.15 * Math.sin(i * 2.1)) * (maxX - minX)
      const z = minZ + (0.25 + 0.5 * u + 0.15 * Math.cos(i * 1.7)) * (maxZ - minZ)
      positions.push({ x, z })
    }
    return positions
  }
}
