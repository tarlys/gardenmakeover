import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

import { BottomHudModel } from './BottomHudModel'
import { BottomHudView } from './BottomHudView'
import type { PreviewEntry } from './types'

export class BottomHudController {
  private readonly previews: PreviewEntry[] = []
  private readonly previewLight = new THREE.DirectionalLight(0xffffff, 1.5)

  constructor(
    private readonly model: BottomHudModel,
    private readonly view: BottomHudView
  ) {
    this.previewLight.position.set(100, 120, 140)
    this.view.scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    this.view.scene.add(this.previewLight)
  }

  mount(): void {
    this.view.render(this.model.getRows(), this.model.getNames())
  }

  resize(width: number, height: number): void {
    this.view.resize(this.model.getRows(), width, height)
  }

  setAssets(sources: Record<string, THREE.Object3D>, animations: THREE.AnimationClip[]): void {
    this.clearPreviews()
    for (const name of this.model.getAllNames()) {
      const source = sources[name]
      const slot = this.view.getSlot(name)
      if (!source || !slot) continue
      this.previews.push(this.createPreview(name, source, animations, slot))
    }
  }

  update(dt: number): void {
    for (const preview of this.previews) {
      if (preview.mixer) {
        preview.mixer.update(dt)
      }
      preview.root.rotation.y += 0.01
    }
  }

  setCardUnlocked(name: string, unlocked: boolean): void {
    this.view.setCardUnlocked(name, unlocked)
  }

  handleClick(raycaster: THREE.Raycaster): string | null {
    return this.view.getClickedCard(raycaster)
  }

  private clearPreviews(): void {
    for (const preview of this.previews) {
      preview.slot.remove(preview.root)
    }
    this.previews.length = 0
  }

  private createPreview(
    name: string,
    source: THREE.Object3D,
    animations: THREE.AnimationClip[],
    slot: THREE.Group
  ): PreviewEntry {
    const previewRoot = new THREE.Group()
    const root = cloneSkeleton(source)
    root.traverse((obj) => {
      if (obj.userData?.isFactoryProgressSprite || obj.name === 'animal_progress_sprite') {
        obj.visible = false
        return
      }
      obj.visible = true
    })
    previewRoot.add(root)
    previewRoot.position.set(0, 10, 4)
    slot.add(previewRoot)
    this.frameModel(root)

    const kind = name.replace(/_\d+$/, '')
    const idleClip = THREE.AnimationClip.findByName(animations, `idle_${kind}`)
    let mixer: THREE.AnimationMixer | null = null
    if (idleClip) {
      mixer = new THREE.AnimationMixer(root)
      const idleAction = mixer.clipAction(idleClip)
      idleAction.setLoop(THREE.LoopRepeat, Infinity)
      idleAction.play()
    }

    return { root: previewRoot, mixer, slot }
  }

  private frameModel(root: THREE.Object3D): void {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z) || 1
    const targetHeight = 82

    root.position.sub(center)
    root.position.y -= box.min.y
    root.scale.setScalar(targetHeight / maxSize)
    root.rotation.y = -0.35
    root.position.y -= 22
  }
}
