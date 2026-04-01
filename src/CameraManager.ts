import * as THREE from 'three'
import gsap from 'gsap'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class CameraManager {
  readonly camera: THREE.PerspectiveCamera
  readonly hudCamera: THREE.OrthographicCamera
  readonly controls: OrbitControls

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000)
    this.camera.position.set(8, 6, 14)

    this.hudCamera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      0.1,
      1000
    )
    this.hudCamera.position.z = 100

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.target.set(0, 0.5, 0)
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05
  }

  projectWorldToHud(worldPosition: THREE.Vector3): THREE.Vector3 {
    const projected = worldPosition.clone().project(this.camera)
    const canvasWidth = this.canvas.clientWidth || window.innerWidth
    const canvasHeight = this.canvas.clientHeight || window.innerHeight
    return new THREE.Vector3(projected.x * canvasWidth * 0.5, projected.y * canvasHeight * 0.5, 0)
  }

  focusOnObject(root: THREE.Object3D, onComplete?: () => void): void {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const focusY = center.y + size.y * 0.2
    const closeTarget = new THREE.Vector3(center.x, focusY, center.z)
    const closePosition = new THREE.Vector3(center.x + 10.2, focusY + 8.1, center.z + 12.2)

    this.controls.enabled = false

    const state = {
      tx: this.controls.target.x,
      ty: this.controls.target.y,
      tz: this.controls.target.z,
    }
    const startPosition = this.camera.position.clone()
    const arcMid = startPosition.clone().lerp(closePosition, 0.5).add(new THREE.Vector3(0, 4.5, 0))
    const motion = { t: 0 }

    gsap.to(motion, {
      t: 1,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        const a = startPosition.clone().lerp(arcMid, motion.t)
        const b = arcMid.clone().lerp(closePosition, motion.t)
        this.camera.position.copy(a.lerp(b, motion.t))
        this.camera.lookAt(this.controls.target)
      },
    })

    gsap.to(state, {
      tx: closeTarget.x,
      ty: closeTarget.y,
      tz: closeTarget.z,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.controls.target.set(state.tx, state.ty, state.tz)
        this.controls.update()
      },
      onComplete: () => {
        this.controls.enabled = true
        onComplete?.()
      },
    })
  }

  frameGround(groundRoot: THREE.Object3D): void {
    const groundBox = new THREE.Box3().setFromObject(groundRoot)
    const center = groundBox.getCenter(new THREE.Vector3())
    const size = groundBox.getSize(new THREE.Vector3())
    const dist = Math.max(size.x, size.z) * 0.9 + 6
    this.controls.target.copy(center)
    this.camera.position.set(center.x + dist * 0.55, center.y + dist * 0.35, center.z + dist * 0.75)
    this.controls.update()
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.hudCamera.left = -width / 2
    this.hudCamera.right = width / 2
    this.hudCamera.top = height / 2
    this.hudCamera.bottom = -height / 2
    this.hudCamera.updateProjectionMatrix()
    this.controls.update()
  }

  update(): void {
    this.controls.update()
  }
}
