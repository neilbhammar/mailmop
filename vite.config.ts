import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/oauth2': {
        target: 'https://oauth2.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oauth2/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom')
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  define: {
    'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID),
    'process.env.VITE_GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_SECRET)
  }
})
