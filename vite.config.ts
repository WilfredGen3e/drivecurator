import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:7071',
    },
  },
}))
