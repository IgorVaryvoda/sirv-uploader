import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'exceljs', 'heic2any'],
  treeshake: true,
  splitting: false,
  minify: false,
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
  // Copy CSS file to dist
  async onSuccess() {
    const fs = await import('fs/promises')
    const path = await import('path')

    const srcCss = path.join(__dirname, 'src/styles/index.css')
    const distCss = path.join(__dirname, 'dist/styles.css')

    try {
      await fs.copyFile(srcCss, distCss)
      console.log('✓ Copied styles.css to dist/')
    } catch (err) {
      console.error('Failed to copy CSS:', err)
    }
  }
})
