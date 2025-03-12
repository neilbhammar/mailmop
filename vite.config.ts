import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteCommonjs(),
    nodePolyfills()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  esbuild: {
    jsx: 'automatic'
  }
})
