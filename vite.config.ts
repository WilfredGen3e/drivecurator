import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Buildnummer als 0.<aantal commits>, zodat in de app zichtbaar is welke versie
// draait. Op de lokale dev-server komt er "-dev" achter. Vereist volledige
// git-historie (zie fetch-depth: 0 in de GitHub Actions workflow).
function buildId(isDev: boolean): string {
  let count = '?'
  try {
    count = execSync('git rev-list --count HEAD').toString().trim()
  } catch { /* geen git beschikbaar in deze omgeving */ }
  return `0.${count}${isDev ? '-dev' : ''}`
}

export default defineConfig(({ command }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(buildId(command === 'serve')),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Iconen + statische SVG's staan in public/ en worden zo meegekopieerd.
      includeAssets: ['apple-touch-icon-180x180.png', 'icon-any.svg'],
      manifest: {
        name: 'DriveCurator',
        short_name: 'DriveCurator',
        description: 'Snel en efficiënt je OneDrive-foto’s opschonen.',
        lang: 'nl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#007aff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache alleen de app-shell (build-assets). Graph-API, /api/* en
        // foto-thumbnails staan hier bewust NIET in → die blijven network-only.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // SPA-fallback voor client-side navigatie, maar nooit voor /api/* of de
        // Azure SWA-auth-paden — anders krijg je index.html i.p.v. een API-respons.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/\.auth\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:7071',
    },
  },
}))
