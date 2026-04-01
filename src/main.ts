import * as THREE from 'three'
import gsap from 'gsap'

import objects2Placement from './objects2-placement'
import { AssetLoader } from './AssetLoader'
import { AnimalFactory } from './AnimalFactory'
import { PlantFactory } from './PlantFactory'
import { HudComponent } from './HudComponent'
import { BottomHudComponent } from './BottomHudComponent'
import { CameraManager } from './CameraManager'
import { LightingManager } from './LightingManager'
import { SoundManager } from './SoundManager'
import type { CoinCollectedPayload, ObjectsPlacementConfig, PlacementConfig } from './types'

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas')

if (!canvasElement) {
  throw new Error('Canvas element not found')
}

const canvas: HTMLCanvasElement = canvasElement

document.body.style.margin = '0'
document.body.style.overflow = 'hidden'
canvas.style.display = 'block'
canvas.style.width = '100vw'
canvas.style.height = '100vh'

const scene = new THREE.Scene()
const hudScene = new THREE.Scene()
const cameraManager = new CameraManager(canvas)
const { camera, hudCamera } = cameraManager

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.autoClear = false

const ambientLight = new THREE.AmbientLight(0xffffff, 0.55)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 2.1)
dirLight.position.set(8, 20, 12)
scene.add(dirLight)

const fill = new THREE.DirectionalLight(0xb8c5ff, 0.35)
fill.position.set(-10, 6, -8)
scene.add(fill)

const assetLoader = new AssetLoader()
const raycaster = new THREE.Raycaster()
const rayDown = new THREE.Vector3(0, -1, 0)
const tmpV = new THREE.Vector3()
const pointer = new THREE.Vector2()
const clock = new THREE.Clock()
let hud: HudComponent
const bottomHud = new BottomHudComponent(hudScene)
const animalFactory = new AnimalFactory(scene)
const plantFactory = new PlantFactory(scene)
const soundManager = new SoundManager()
const lightingManager = new LightingManager({
  scene,
  renderer,
  ambientLight,
  dirLight,
  fillLight: fill,
})

let hasVisibleHint = false
let hasVisibleWinMessage = false
let hasShownPlantHint = false
let hasShownCowFocus = false
let cornRootRef: THREE.Object3D | null = null
let cowRootRef: THREE.Object3D | null = null

animalFactory.setCoinCollectedHandler(handleCollectedCoin)
plantFactory.setCoinCollectedHandler(handleCollectedCoin)

function handleCollectedCoin({ pivot, model, amount, sourceType, sourceName, hudCardName }: CoinCollectedPayload): void {
  const startWorld = pivot.getWorldPosition(new THREE.Vector3())
  const startHud = cameraManager.projectWorldToHud(startWorld)
  const targetHud = hud.getCollectTargetPosition()

  scene.remove(pivot)
  const flyingPivot = new THREE.Group()
  const flyingModel = model.clone(true)
  flyingPivot.add(flyingModel)
  flyingPivot.position.copy(startHud)
  flyingModel.scale.setScalar(100)
  hudScene.add(flyingPivot)

  gsap.to(flyingPivot.position, {
    x: targetHud.x,
    y: targetHud.y,
    z: 0,
    duration: 1.3,
    ease: 'power2.inOut',
    onComplete: () => {
      hudScene.remove(flyingPivot)
      hud.addPoints(amount)
      if (hudCardName) {
        bottomHud.setCardUnlocked(hudCardName, true)
      }
      if (sourceType === 'animal' && sourceName === 'cow_1') {
        hasVisibleWinMessage = true
        hud.showMessage('Perfect win!\nNow you can build your own farm!')
      }
      if (!hasShownPlantHint && cornRootRef) {
        hasShownPlantHint = true
        focusCameraOnObject(cornRootRef, 'Tap on plant')
      } else if (sourceType === 'plant' && !hasShownCowFocus && cowRootRef) {
        hasShownCowFocus = true
        focusCameraOnObject(cowRootRef, 'Tap on cow')
      }
    },
  })

  gsap.to(flyingPivot.rotation, {
    z: Math.PI * 2,
    duration: 1.3,
    ease: 'none',
  })
}

function focusCameraOnObject(root: THREE.Object3D, hintText?: string): void {
  cameraManager.focusOnObject(root, () => {
    if (hintText) {
      hasVisibleHint = true
      bottomHud.setHint(hintText)
    }
  })
}

function centerGround(root: THREE.Object3D): void {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  root.position.x -= center.x
  root.position.z -= center.z
  root.position.y -= box.min.y
}

function extractPlacables(root: THREE.Object3D): THREE.Object3D[] {
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

function heightOnGround(groundRoot: THREE.Object3D, x: number, z: number, rayTop = 800): number {
  tmpV.set(x, rayTop, z)
  raycaster.set(tmpV, rayDown)
  const hits = raycaster.intersectObject(groundRoot, true)
  return hits.length ? hits[0].point.y : 0
}

function placeOnTerrain(obj: THREE.Object3D, groundRoot: THREE.Object3D, x: number, z: number): void {
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
  const ySurf = heightOnGround(groundRoot, gx, gz)
  obj.position.y += ySurf - box.min.y
}

function applyPlacement(
  obj: THREE.Object3D,
  groundRoot: THREE.Object3D,
  p: PlacementConfig | null,
  fallback: { x: number; z: number }
): void {
  if (!p) {
    placeOnTerrain(obj, groundRoot, fallback.x, fallback.z)
    return
  }

  const hasX = typeof p.x === 'number'
  const hasY = typeof p.y === 'number'
  const hasZ = typeof p.z === 'number'

  if (hasX && hasY && hasZ) {
    obj.position.set(p.x!, p.y!, p.z!)
    return
  }

  const x = hasX ? p.x! : fallback.x
  const z = hasZ ? p.z! : fallback.z
  placeOnTerrain(obj, groundRoot, x, z)
  if (typeof p.yOffset === 'number') {
    obj.position.y += p.yOffset
  }
}

function applyVisibility(obj: THREE.Object3D, placement: PlacementConfig | null): void {
  if (!placement || placement.visible === undefined) {
    obj.visible = true
    return
  }
  obj.visible = Boolean(placement.visible)
}

function resolvePlacement(obj: THREE.Object3D, index: number, cfg: ObjectsPlacementConfig): PlacementConfig | null {
  const name = obj.name
  if (name && cfg.byName[name] !== undefined) {
    return cfg.byName[name]
  }
  if (cfg.byIndex[index] !== undefined) {
    return cfg.byIndex[index]
  }
  return null
}

function buildAutoPositions(n: number, minX: number, maxX: number, minZ: number, maxZ: number): Array<{ x: number; z: number }> {
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

function playIntroToSheep(sheepRoot: THREE.Object3D | null): void {
  if (!sheepRoot) return
  focusCameraOnObject(sheepRoot, 'Tap on sheep')
}

async function loadModels(): Promise<void> {
  const groundGltf = await assetLoader.loadGround2()
  const groundRoot = groundGltf.scene
  scene.add(groundRoot)
  centerGround(groundRoot)

  groundRoot.updateMatrixWorld(true)
  const groundBox = new THREE.Box3().setFromObject(groundRoot)
  const pad = 0.4
  const minX = groundBox.min.x + pad
  const maxX = groundBox.max.x - pad
  const minZ = groundBox.min.z + pad
  const maxZ = groundBox.max.z - pad

  const objectsGltf = await assetLoader.loadObjects2()
  const placables = extractPlacables(objectsGltf.scene)
  const sheepRoot = placables.find((obj) => obj.name === 'sheep_1') ?? null
  cornRootRef = placables.find((obj) => obj.name === 'corn_1') ?? null
  cowRootRef = placables.find((obj) => obj.name === 'cow_1') ?? null

  const n = placables.length
  const autoPositions = buildAutoPositions(n, minX, maxX, minZ, maxZ)
  const centerFallback = {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
  }

  if (n === 0) {
    console.warn('objects2.glb: нет отдельных узлов для расстановки')
  }

  placables.forEach((obj, i) => {
    scene.add(obj)
    const placement = resolvePlacement(obj, i, objects2Placement)
    const fallback = autoPositions[i] ?? centerFallback
    applyPlacement(obj, groundRoot, placement, fallback)
    applyVisibility(obj, placement)
    animalFactory.register(obj, objectsGltf.animations)
    plantFactory.register(obj)
  })

  const fenceSource = placables.find((obj) => obj.name === 'fence')
  if (fenceSource) {
    const extraFence = fenceSource.clone(true)
    const extraFencePlacement = objects2Placement.extraFence ?? { x: -11.5, z: 8 }
    scene.add(extraFence)
    applyPlacement(extraFence, groundRoot, extraFencePlacement, centerFallback)
    applyVisibility(extraFence, extraFencePlacement)
    extraFence.rotation.y = typeof extraFencePlacement.rotationY === 'number' ? extraFencePlacement.rotationY : Math.PI
  }

  plantFactory.finalize()
  bottomHud.setAssets(
    Object.fromEntries(placables.map((obj) => [obj.name, obj])) as Record<string, THREE.Object3D>,
    objectsGltf.animations
  )

  const coinGltf = await assetLoader.loadCoin()
  const coinModel = coinGltf.scene
  const coinPlacement = objects2Placement.coin
  coinModel.rotation.set(coinPlacement.rotationX ?? 0, coinPlacement.rotationY ?? Math.PI, coinPlacement.rotationZ ?? 0)
  animalFactory.setCoinTemplate(coinModel, coinPlacement)
  plantFactory.setCoinTemplate(coinModel, coinPlacement)

  cameraManager.frameGround(groundRoot)
  playIntroToSheep(sheepRoot)
}

function restoreFromHudCard(cardName: string): boolean {
  if (animalFactory.restoreByName(cardName)) {
    bottomHud.setCardUnlocked(cardName, false)
    return true
  }

  const plantKey = cardName.replace(/_\d+$/, '')
  if (plantFactory.restoreByKey(plantKey)) {
    bottomHud.setCardUnlocked(cardName, false)
    return true
  }

  return false
}

function onCanvasClick(event: MouseEvent): void {
  if (hud.handlePointerDown(event.clientX, event.clientY)) {
    return
  }
  soundManager.startThemeMusic()
  if (hasVisibleHint) {
    hasVisibleHint = false
    bottomHud.setHint('')
  }
  if (hasVisibleWinMessage) {
    hasVisibleWinMessage = false
    hud.showMessage('')
  }
  const rect = canvas.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, hudCamera)
  const hudCardName = bottomHud.handleClick(raycaster)
  if (hudCardName && restoreFromHudCard(hudCardName)) {
    return
  }

  raycaster.setFromCamera(pointer, camera)
  animalFactory.handleClick(raycaster)
  plantFactory.handleClick(raycaster)
}

function onResize(): void {
  const w = canvas.clientWidth || window.innerWidth
  const h = canvas.clientHeight || window.innerHeight
  cameraManager.resize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h, false)
  hud.resize(w, h)
  bottomHud.resize(w, h)
}

function resizeRendererToDisplaySize(): void {
  const pixelRatio = Math.min(window.devicePixelRatio, 2)
  const width = Math.floor(canvas.clientWidth * pixelRatio)
  const height = Math.floor(canvas.clientHeight * pixelRatio)
  const needResize = canvas.width !== width || canvas.height !== height
  if (needResize) {
    onResize()
  }
}

function tick(): void {
  requestAnimationFrame(tick)
  resizeRendererToDisplaySize()
  const dt = clock.getDelta()
  animalFactory.update(dt)
  plantFactory.update()
  bottomHud.update(dt)
  cameraManager.update()
  renderer.clear()
  renderer.render(scene, camera)
  renderer.clearDepth()
  renderer.render(hudScene, hudCamera)
}

async function bootstrap(): Promise<void> {
  hud = await HudComponent.create(hudScene, 0)
  hud.resize(window.innerWidth, window.innerHeight)
  hud.setToggleLabel(lightingManager.getToggleLabel())
  hud.setToggleLightingHandler(() => {
    lightingManager.toggle()
    hud.setToggleLabel(lightingManager.getToggleLabel())
  })
  bottomHud.resize(window.innerWidth, window.innerHeight)
  canvas.addEventListener('click', onCanvasClick)
  hud.addDomClickListener(onCanvasClick)
  await loadModels()
  tick()
}

bootstrap().catch((err: unknown) => {
  console.error(err)
})
