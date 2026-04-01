/// <reference types="vite/client" />

declare module '*.glb?url' {
  const src: string
  export default src
}

declare module '*.mp3' {
  const src: string
  export default src
}
