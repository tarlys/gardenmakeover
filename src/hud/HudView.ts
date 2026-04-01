import * as THREE from 'three'
import { Application, Container, Graphics, Text } from 'pixi.js'

export class HudView {
  readonly collectTarget = new THREE.Vector3()
  private readonly app: Application
  private readonly root = new Container()
  private readonly balanceBox = new Graphics()
  private readonly balanceText = new Text()
  private readonly messageGroup = new Container()
  private readonly messageBox = new Graphics()
  private readonly messageText = new Text()

  private constructor(app: Application) {
    this.app = app

    this.balanceText.anchor.set(0.5)
    this.balanceText.style = {
      fill: '#fff8d6',
      fontFamily: 'Arial',
      fontSize: 21,
      fontWeight: '600',
    }

    this.messageText.anchor.set(0.5)
    this.messageText.style = {
      fill: '#fff8d6',
      fontFamily: 'Arial',
      fontSize: 17,
      fontWeight: '700',
      align: 'center',
    }

    this.root.addChild(this.balanceBox, this.balanceText)
    this.messageGroup.addChild(this.messageBox, this.messageText)
    this.messageGroup.visible = false

    this.app.stage.addChild(this.root, this.messageGroup)
  }

  static async create(): Promise<HudView> {
    const pixiCanvas = document.createElement('canvas')
    pixiCanvas.style.position = 'fixed'
    pixiCanvas.style.inset = '0'
    pixiCanvas.style.width = '100vw'
    pixiCanvas.style.height = '100vh'
    pixiCanvas.style.pointerEvents = 'none'
    pixiCanvas.style.zIndex = '2'
    document.body.appendChild(pixiCanvas)

    const app = new Application()
    await app.init({
      canvas: pixiCanvas,
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: window,
    })

    return new HudView(app)
  }

  render(balance: number): void {
    this.drawRoundedPanel(this.balanceBox, 260, 64, 0x0c120c, 0.55, 0xffffff, 0.25, 46)
    this.balanceText.text = `Balance: ${balance}`
    this.balanceText.position.set(0, 0)
  }

  resize(_width: number, height: number): void {
    this.app.renderer.resize(window.innerWidth, window.innerHeight)
    this.root.position.set(window.innerWidth / 2, 56)
    this.messageGroup.position.set(window.innerWidth / 2, window.innerHeight / 2)
    this.collectTarget.set(0, height / 2 - 56, 0)
  }

  showMessage(text: string): void {
    this.messageGroup.visible = Boolean(text)
    if (!text) return

    this.drawRoundedPanel(this.messageBox, 440, 110, 0x0c120c, 0.72, 0xffffff, 0.28, 34)
    this.messageText.text = text
    this.messageText.position.set(0, 0)
  }

  private drawRoundedPanel(
    graphics: Graphics,
    width: number,
    height: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor: number,
    strokeAlpha: number,
    radius: number
  ): void {
    graphics.clear()
    graphics.roundRect(-width / 2, -height / 2, width, height, radius)
    graphics.fill({ color: fillColor, alpha: fillAlpha })
    graphics.stroke({ color: strokeColor, alpha: strokeAlpha, width: 3 })
  }
}
