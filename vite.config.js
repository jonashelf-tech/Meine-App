import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: { cleanupOutdatedCaches: true, clientsClaim: true },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'ADHS Planner',
        short_name: 'Planner',
        description: 'Dein ADHS-freundlicher Tagesplaner',
        theme_color: '#0a0a12',
        background_color: '#0a0a12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        // Homescreen-Langdruck → direkt ins Quick-Add (Android, installierte PWA)
        shortcuts: [
          {
            name: 'Neues Todo',
            short_name: 'Neues Todo',
            url: '/?neu=1',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        // Text aus anderen Apps teilen → landet vorbefüllt im Quick-Add
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
    }),
  ],
})
