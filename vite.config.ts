import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    open: true,
  },
  base: './',
  build: {
    sourcemap: false,
    cssCodeSplit: false,
    modulePreload: false,
    target: 'es2018',
  },
})
