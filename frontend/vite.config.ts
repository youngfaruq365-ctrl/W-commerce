import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: isDev
        },
        workbox: {
          // Exclude API routes from service worker caching
          navigateFallbackDenylist: [/^\/api/],
          // Cache static assets aggressively
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
            },
            {
              urlPattern: /^https:\/\/res\.cloudinary\.com/,
              handler: 'CacheFirst',
              options: { cacheName: 'cloudinary-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } }
            }
          ]
        },
        manifest: {
          name: 'W-Delivery OS',
          short_name: 'W-Delivery',
          description: 'Delivery OS for Courier and Dispatch',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react']
    },
    build: {
      // Production build optimizations
      sourcemap: false,          // Do not expose source maps in production
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
              if (id.includes('react-router-dom')) return 'router';
              if (id.includes('@tanstack/react-query')) return 'query';
              if (id.includes('recharts')) return 'charts';
              if (id.includes('framer-motion')) return 'motion';
              if (id.includes('@stripe/stripe-js')) return 'stripe';
            }
          }
        }
      },
      chunkSizeWarningLimit: 800
    },
    server: isDev ? {
      host: '::',
      port: 5175,
      strictPort: true,
      proxy: {
        // Forward all /api requests to Express backend — DEV ONLY
        // This block is NOT included in production builds.
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          ws: true,
        },
      },
    } : {},
  }
})
