import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { branding } from './src/branding'

// Vult de %BRANDING_*%-placeholders in index.html vanuit de centrale
// brandingconfig (zie src/branding.ts). Zo komt er nergens hardcoded merknaam
// of meta in de HTML te staan.
function brandingHtml(): Plugin {
  const map: Record<string, string> = {
    '%BRANDING_NAME%': branding.name,
    '%BRANDING_TITLE%': branding.title,
    '%BRANDING_LANG%': branding.lang,
    '%BRANDING_DESCRIPTION%': branding.description,
    '%BRANDING_THEME_COLOR%': branding.themeColor,
    '%BRANDING_APPLE_TOUCH_ICON%': branding.appleTouchIcon,
    '%BRANDING_OG_TITLE%': branding.og.title,
    '%BRANDING_OG_DESCRIPTION%': branding.og.description,
    '%BRANDING_OG_IMAGE%': branding.og.image,
  }
  return {
    name: 'drivecurator-branding-html',
    transformIndexHtml: (html) =>
      html.replace(/%BRANDING_[A-Z_]+%/g, (token) => map[token] ?? token),
  }
}

// Serveert de nep-foto's voor de screenshot-harness op /mock/* — ALLEEN in de
// dev-server (apply: 'serve'). Ze staan bewust in e2e/mock-photos/ i.p.v.
// public/, zodat ze niet in de productiebuild (dist/) belanden.
function mockPhotos(): Plugin {
  const dir = join(__dirname, 'e2e', 'mock-photos')
  const types: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }
  return {
    name: 'drivecurator-mock-photos',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/mock', (req, res, next) => {
        // Pad-traversal blokkeren: alleen een kale bestandsnaam toestaan.
        const name = normalize(decodeURIComponent((req.url ?? '').split('?')[0])).replace(/^[/\\]+/, '')
        if (!name || name.includes('/') || name.includes('\\')) return next()
        res.setHeader('Content-Type', types[extname(name).toLowerCase()] ?? 'application/octet-stream')
        createReadStream(join(dir, name)).on('error', () => next()).pipe(res)
      })
    },
  }
}

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
    brandingHtml(),
    mockPhotos(),
    VitePWA({
      // 'prompt': een nieuwe versie staat klaar zonder direct te herladen; de
      // gebruiker past 'm toe via de verstopte update-actie in de app-naam
      // (zie usePwaUpdate + App-header). Voorkomt dat een geïnstalleerde PWA op
      // een oude buildversie blijft hangen.
      registerType: 'prompt',
      // Iconen + statische SVG's staan in public/ en worden zo meegekopieerd.
      includeAssets: ['apple-touch-icon-180x180.png', 'icon-any.svg'],
      manifest: {
        name: branding.name,
        short_name: branding.shortName,
        description: branding.description,
        lang: branding.lang,
        start_url: branding.pwa.startUrl,
        scope: branding.pwa.scope,
        display: branding.pwa.display,
        background_color: branding.backgroundColor,
        theme_color: branding.themeColor,
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
