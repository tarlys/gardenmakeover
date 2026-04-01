import type * as THREE from 'three'

export type CardEntry = {
  card: THREE.Mesh
  overlay: THREE.Mesh
  unlocked: boolean
}

export type PreviewEntry = {
  root: THREE.Group
  mixer: THREE.AnimationMixer | null
  slot: THREE.Group
}
