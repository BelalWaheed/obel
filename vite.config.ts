import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [ 'obel.jpg'],
      manifest: {
        name: 'Obel Focus',
        short_name: 'Obel',
        description: 'Premium Productivity & Focus Application',
        theme_color: '#100d12',
        background_color: '#100d12',
        display: 'standalone',
        icons: [
          {
            src: 'obel.jpg',
            sizes: '192x192 512x512',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: 'obel.jpg',
            sizes: '192x192 512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'New Task',
            short_name: 'New',
            description: 'Quickly create a new task',
            url: '/tasks?action=new',
            icons: [{ src: 'obel.jpg', sizes: '192x192' }]
          },
          {
            name: 'Daily Planner',
            short_name: 'Planner',
            description: 'View your schedule for today',
            url: '/planner',
            icons: [{ src: 'obel.jpg', sizes: '192x192' }]
          },
          {
            name: 'Pomodoro',
            short_name: 'Focus',
            description: 'Start a focus session',
            url: '/pomodoro',
            icons: [{ src: 'obel.jpg', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /.*\/tasks.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'tasks-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /.*\/habits.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'habits-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /.*\/tasks.*/i,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'tasks-post-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /.*\/tasks.*/i,
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'tasks-put-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /.*\/habits.*/i,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'habits-post-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /.*\/habits.*/i,
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'habits-put-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /.*\/tasks.*/i,
            handler: 'NetworkOnly',
            method: 'DELETE',
            options: {
              backgroundSync: {
                name: 'tasks-delete-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /.*\/habits.*/i,
            handler: 'NetworkOnly',
            method: 'DELETE',
            options: {
              backgroundSync: {
                name: 'habits-delete-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: /.*\/users.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'user-cache',
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: /.*\/users.*/i,
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'user-update-sync',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
        ],
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide')) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
