import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(process.cwd(), '../');
  const env = loadEnv(mode, envDir, '');
  const isDev = mode === 'development'

  return {
    envDir: '../',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false
        },
        workbox: {
          // Exclude API routes from service worker caching
          navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
          // Heavy, route-specific chunks are cached on demand instead of precached
          globIgnores: [
            '**/emoji-*.js', '**/charts-*.js', '**/maps-*.js',
            '**/ActiveDelivery-*.js', '**/StorePreviewPage-*.js',
          ],
          // Cache static assets aggressively
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.destination === 'script' && url.pathname.startsWith('/assets/'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'lazy-chunks', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } }
            },
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
          name: 'W-Commerce',
          short_name: 'W-Commerce',
          description: 'Commerce and delivery OS for sellers, buyers, and couriers',
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
        "@": path.resolve(import.meta.dirname, "./src"),
        "react": path.resolve(import.meta.dirname, "../node_modules/react"),
        "react-dom": path.resolve(import.meta.dirname, "../node_modules/react-dom"),
        "react-router-dom": path.resolve(import.meta.dirname, "../node_modules/react-router-dom"),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-router', 'react-router-dom']
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'lucide-react',
        'framer-motion',
        'axios',
        'zustand',
        'react-hot-toast',
        'socket.io-client',
        'emoji-picker-react',
        'recharts',
        'clsx',
        'tailwind-merge',
        'date-fns',
        'dompurify',
        'uuid',
        'canvas-confetti',
        'swiper/react',
        'swiper/modules',
        '@react-google-maps/api',
        'html5-qrcode',
        'react-qr-code',
        'react-signature-canvas',
        'react-webcam',
        '@simplewebauthn/browser',
        'react-onesignal',
        '@sentry/react',
        '@capacitor/core',
        '@capacitor-community/admob',
        '@revenuecat/purchases-capacitor'
      ]
    },
    build: {
      // Production build optimizations
      sourcemap: false,          // Do not expose source maps in production
      target: 'es2020',
      rollupOptions: {
        output: {
      manualChunks(id) {
            if (id.includes('node_modules')) {
              const p = id.replace(/\\/g, '/');
              if (p.includes('/react-router') || p.includes('/@remix-run/')) return 'router';
              if (p.includes('/@tanstack/')) return 'query';
              if (p.includes('/recharts') || p.includes('/d3-')) return 'charts';
              if (p.includes('/framer-motion') || p.includes('/motion-')) return 'motion';
              if (p.includes('/@stripe/')) return 'stripe';
              if (p.includes('/socket.io-client') || p.includes('/engine.io-client')) return 'socket';
              if (p.includes('/emoji-picker-react')) return 'emoji';
              if (p.includes('/lucide-react')) return 'lucide';
              if (p.includes('/zustand')) return 'state';
              if (p.includes('/lodash') || p.includes('/es-toolkit')) return 'utils';
              if (p.includes('/axios')) return 'http';
              if (p.includes('/swiper')) return 'swiper';
              if (p.includes('/@react-google-maps') || p.includes('/@googlemaps/')) return 'maps';
              if (/\/node_modules\/(react|react-dom|scheduler)\//.test(p)) return 'react-vendor';
            }
          }
        }
      },
      chunkSizeWarningLimit: 800
    },
    server: isDev ? {
      host: '::',
      port: 5175,
      strictPort: false,
      proxy: {
        // Forward all /api requests to Express backend — DEV ONLY
        // This block is NOT included in production builds.
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          ws: true,
        },
      },
    } : {},
  }
})
