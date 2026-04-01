import * as THREE from 'three'
import gsap from 'gsap'

import type { CardEntry } from './types'

export class BottomHudView {
  readonly root = new THREE.Group()
  readonly scene: THREE.Scene
  private readonly slots = new Map<string, THREE.Group>()
  private readonly cards = new Map<string, CardEntry>()
  private readonly hint: THREE.Sprite

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.hint = this.createHintLabel('')
    this.hint.visible = false
    this.scene.add(this.root)
    this.scene.add(this.hint)
  }

  render(rows: string[][], names: string[]): void {
    this.root.clear()
    this.slots.clear()
    this.cards.clear()

    rows.flat().forEach((name, index) => {
      const slot = new THREE.Group()
      slot.name = `${name}_slot`

      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(108, 108),
        new THREE.MeshBasicMaterial({
          color: 0x122012,
          transparent: true,
          opacity: 0.55,
        })
      )
      card.userData.cardName = name
      slot.add(card)

      const overlay = new THREE.Mesh(
        new THREE.PlaneGeometry(108, 108),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.62,
          depthTest: false,
        })
      )
      overlay.position.z = 1
      slot.add(overlay)

      const viewport = new THREE.Group()
      viewport.position.y = 12
      slot.add(viewport)

      const label = this.createLabel(names[index])
      label.position.y = -36
      slot.add(label)

      this.root.add(slot)
      this.slots.set(name, viewport)
      this.slots.set(`${name}:slot`, slot)
      this.cards.set(name, { card, overlay, unlocked: false })
    })
  }

  resize(rows: string[][], _width: number, height: number): void {
    const gap = 126
    const rowGap = 120
    rows.forEach((row, rowIndex) => {
      const totalWidth = (row.length - 1) * gap
      row.forEach((name, colIndex) => {
        const slot = this.slots.get(`${name}:slot`)
        if (!slot) return
        slot.position.set(colIndex * gap - totalWidth / 2, -height / 2 + 86 + (1 - rowIndex) * rowGap, 0)
      })
    })
    this.hint.position.set(0, -height / 2 + 300, 0)
  }

  getSlot(name: string): THREE.Group | null {
    return this.slots.get(name) ?? null
  }

  setCardUnlocked(name: string, unlocked: boolean): void {
    const entry = this.cards.get(name)
    if (!entry) return
    entry.unlocked = unlocked
    entry.overlay.visible = !unlocked
  }

  getClickedCard(raycaster: THREE.Raycaster): string | null {
    const meshes = [...this.cards.values()].map((entry) => entry.card)
    const hits = raycaster.intersectObjects(meshes, false)
    for (const hit of hits) {
      const name = hit.object.userData.cardName as string | undefined
      if (!name) continue
      const entry = this.cards.get(name)
      if (entry?.unlocked) return name
    }
    return null
  }

  setHint(text: string): void {
    gsap.killTweensOf(this.hint.scale)
    this.hint.visible = Boolean(text)
    if (!text) {
      this.hint.scale.set(200, 34, 1)
      return
    }
    this.drawTextToSprite(this.hint, text, 420, 72, '700 30px Arial')
    this.hint.scale.set(0.001, 0.001, 1)
    gsap.to(this.hint.scale, {
      x: 200,
      y: 34,
      duration: 0.35,
      ease: 'back.out(1.4)',
    })
  }

  private createLabel(text: string): THREE.Sprite {
    const sprite = this.createTextSprite(256, 64)
    this.drawTextToSprite(sprite, text, 256, 64, '600 26px Arial')
    sprite.scale.set(92, 22, 1)
    return sprite
  }

  private createHintLabel(text: string): THREE.Sprite {
    const sprite = this.createTextSprite(420, 72)
    this.drawTextToSprite(sprite, text, 420, 72, '700 30px Arial')
    sprite.scale.set(200, 34, 1)
    return sprite
  }

  private createTextSprite(width: number, height: number): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      })
    )
  }

  private drawTextToSprite(sprite: THREE.Sprite, text: string, width: number, height: number, font: string): void {
    const canvas = sprite.material.map?.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('2D canvas context is unavailable')
    }
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(12, 18, 12, 0.58)'
    this.roundRect(ctx, 6, 6, width - 12, height - 12, 24)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#fff8d6'
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, height / 2)
    sprite.material.map!.needsUpdate = true
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + w, y, x + w, y + h, radius)
    ctx.arcTo(x + w, y + h, x, y + h, radius)
    ctx.arcTo(x, y + h, x, y, radius)
    ctx.arcTo(x, y, x + w, y, radius)
    ctx.closePath()
  }
}
