import type * as THREE from 'three'
import gsap from 'gsap'

export function startCoinSpinGsap(pivot: THREE.Object3D, radPerSec: number): () => void {
  if (radPerSec <= 0) return () => {}

  const period = (Math.PI * 2) / radPerSec
  let alive = true

  const step = (): void => {
    if (!alive) return
    gsap.to(pivot.rotation, {
      x: `+=${Math.PI * 2}`,
      duration: period,
      ease: 'none',
      onComplete: step,
    })
  }

  step()

  return () => {
    alive = false
    gsap.killTweensOf(pivot.rotation)
  }
}
