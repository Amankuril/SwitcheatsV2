import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const foodSrc = path.resolve(__dirname, './src/modules/Food')
const servicesApi = path.resolve(__dirname, './src/services/api')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // More specific first so @food/api/* resolves to services (no backend)
      '@food/api/axios': path.resolve(servicesApi, 'axios.js'),
      '@food/api/config': path.resolve(servicesApi, 'config.js'),
      '@food/api': servicesApi,
      '@food': foodSrc,
      '@delivery': path.resolve(__dirname, './src/modules/DeliveryV2'),
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/x-date-pickers',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('zustand')) {
            return 'vendor-state'
          }
          if (id.includes('engine.io-client') || id.includes('socket.io-parser') || id.includes('@socket.io/')) {
            return 'vendor-network'
          }
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'vendor-mui'
          if (
            id.includes('stylis') ||
            id.includes('prop-types') ||
            id.includes('hoist-non-react-statics')
          ) {
            return 'vendor-mui'
          }
          if (id.includes('@radix-ui/') || id.includes('react-day-picker') || id.includes('dayjs')) {
            return 'vendor-ui'
          }
          if (
            id.includes('@floating-ui/') ||
            id.includes('react-remove-scroll') ||
            id.includes('react-style-singleton') ||
            id.includes('use-callback-ref') ||
            id.includes('use-sidecar')
          ) {
            return 'vendor-ui'
          }
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('@react-google-maps') || id.includes('@googlemaps/')) return 'vendor-maps'
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('framer-motion') || id.includes('gsap') || id.includes('canvas-confetti') || id.includes('lenis')) {
            return 'vendor-motion'
          }
          if (id.includes('lucide-react') || id.includes('react-icons') || id.includes('@heroicons/react')) {
            return 'vendor-icons'
          }
          if (id.includes('axios') || id.includes('socket.io-client')) return 'vendor-network'
          if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'vendor-export-pdf'
          if (id.includes('exceljs')) return 'vendor-export-excel'
          if (id.includes('html2canvas')) return 'vendor-export-canvas'
          if (id.includes('sonner') || id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
            return 'vendor-utils'
          }
          if (id.includes('next-themes') || id.includes('react-colorful') || id.includes('react-is')) {
            return 'vendor-misc'
          }
          return 'vendor-core'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Backend API (default 5000)
      '/api/v1': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
