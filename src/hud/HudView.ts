import * as THREE from 'three'

export class HudView {
  readonly group = new THREE.Group()
  private readonly messageGroup = new THREE.Group()
  private readonly canvas = document.createElement('canvas')
  private readonly ctx: CanvasRenderingContext2D
  private readonly texture: THREE.CanvasTexture
  private readonly sprite: THREE.Sprite
  private readonly messageSprite: THREE.Sprite

  constructor(private readonly scene: THREE.Scene) {
    this.canvas.width = 512
    this.canvas.height = 128
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('2D canvas context is unavailable')
    }
    this.ctx = ctx
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
      })
    )
    this.sprite.scale.set(260, 64, 1)
    this.group.add(this.sprite)

    this.messageSprite = this.createMessageSprite()
    this.messageGroup.add(this.messageSprite)
    this.messageGroup.visible = false

    this.scene.add(this.group)
    this.scene.add(this.messageGroup)
  }

  render(balance: number): void {
    const { ctx, canvas } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(12, 18, 12, 0.55)'
    this.roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 46)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#fff8d6'
    ctx.font = '600 42px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Balance: ${balance}`, canvas.width / 2, canvas.height / 2)
    this.texture.needsUpdate = true
  }

  resize(_width: number, height: number): void {
    this.group.position.set(0, height / 2 - 56, 0)
    this.messageGroup.position.set(0, 0, 0)
  }

  showMessage(text: string): void {
    this.messageGroup.visible = Boolean(text)
    if (!text) return

    const canvas = this.messageSprite.material.map?.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('2D canvas context is unavailable')
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(12, 18, 12, 0.72)'
    this.roundRect(ctx, 16, 16, canvas.width - 32, canvas.height - 32, 34)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#fff8d6'
    ctx.font = '700 34px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    this.drawMultilineText(ctx, text, canvas.width / 2, canvas.height / 2, 42)
    this.messageSprite.material.map!.needsUpdate = true
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

  private createMessageSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      })
    )
    sprite.scale.set(440, 110, 1)
    return sprite
  }

  private drawMultilineText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    lineHeight: number
  ): void {
    const lines = text.split('\n')
    const startY = y - ((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + index * lineHeight)
    })
  }
}
