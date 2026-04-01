import { Howl, Howler } from 'howler'

import themeSoundUrl from '../assets/sounds/theme.mp3'

export class SoundManager {
  private hasStartedThemeMusic = false

  private readonly themeMusic = new Howl({
    src: [themeSoundUrl],
    loop: true,
    volume: 0.45,
    html5: true,
  })

  startThemeMusic(): void {
    if (this.hasStartedThemeMusic) return
    this.hasStartedThemeMusic = true
    Howler.autoUnlock = true
    this.themeMusic.play()
  }
}
