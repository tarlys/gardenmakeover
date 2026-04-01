import * as THREE from 'three'

export type LightingMode = 'day' | 'night'

type LightingManagerOptions = {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  ambientLight: THREE.AmbientLight
  dirLight: THREE.DirectionalLight
  fillLight: THREE.DirectionalLight
}

export class LightingManager {
  private readonly scene: THREE.Scene
  private readonly renderer: THREE.WebGLRenderer
  private readonly ambientLight: THREE.AmbientLight
  private readonly dirLight: THREE.DirectionalLight
  private readonly fillLight: THREE.DirectionalLight
  private backgroundTexture: THREE.CanvasTexture | null = null
  private mode: LightingMode = 'day'

  constructor(options: LightingManagerOptions) {
    this.scene = options.scene
    this.renderer = options.renderer
    this.ambientLight = options.ambientLight
    this.dirLight = options.dirLight
    this.fillLight = options.fillLight
    this.apply('day')
  }

  getMode(): LightingMode {
    return this.mode
  }

  getToggleLabel(): string {
    return this.mode === 'day' ? 'Night mode' : 'Day mode'
  }

  toggle(): LightingMode {
    const nextMode: LightingMode = this.mode === 'day' ? 'night' : 'day'
    this.apply(nextMode)
    return this.mode
  }

  apply(mode: LightingMode): void {
    this.mode = mode

    if (mode === 'day') {
      this.setGradientBackground('#648339', '#ffffff')
      this.ambientLight.color.set(0xffffff)
      this.ambientLight.intensity = 0.55
      this.dirLight.color.set(0xffffff)
      this.dirLight.intensity = 2.1
      this.fillLight.color.set(0xb8c5ff)
      this.fillLight.intensity = 0.35
      this.renderer.toneMappingExposure = 1
      return
    }

    this.setGradientBackground('#06142b', '#27405c')
    this.ambientLight.color.set(0x7f9dff)
    this.ambientLight.intensity = 0.28
    this.dirLight.color.set(0x8eb8ff)
    this.dirLight.intensity = 0.7
    this.fillLight.color.set(0x3f6fff)
    this.fillLight.intensity = 0.55
    this.renderer.toneMappingExposure = 0.62
  }

  private setGradientBackground(topColor: string, bottomColor: string): void {
    const el = document.createElement('canvas')
    el.width = 512
    el.height = 256
    const ctx = el.getContext('2d')
    if (!ctx) {
      throw new Error('2D canvas context is unavailable')
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, el.height)
    gradient.addColorStop(0, topColor)
    gradient.addColorStop(1, bottomColor)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, el.width, el.height)

    this.backgroundTexture?.dispose()
    this.backgroundTexture = new THREE.CanvasTexture(el)
    this.backgroundTexture.colorSpace = THREE.SRGBColorSpace
    this.scene.background = this.backgroundTexture
  }
}
