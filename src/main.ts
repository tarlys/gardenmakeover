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
import { WorldBuilder } from './WorldBuilder'
import type { CoinCollectedPayload } from './types'

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
const worldBuilder = new WorldBuilder({
  scene,
  assetLoader,
  animalFactory,
  plantFactory,
  bottomHud,
  cameraManager,
  placementConfig: objects2Placement,
  raycaster,
  rayDown,
  tmpV,
})
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

function playIntroToSheep(sheepRoot: THREE.Object3D | null): void {
  if (!sheepRoot) return
  focusCameraOnObject(sheepRoot, 'Tap on sheep')
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
  const world = await worldBuilder.build()
  cornRootRef = world.cornRoot
  cowRootRef = world.cowRoot
  playIntroToSheep(world.sheepRoot)
  tick()
}

bootstrap().catch((err: unknown) => {
  console.error(err)
})
