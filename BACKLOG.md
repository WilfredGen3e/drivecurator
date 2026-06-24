# DriveCurator — Backlog

Levend overzicht van wat er nog te doen staat. Bijwerken zodra items af zijn of
nieuwe opduiken. Zie `PRD.md` voor de oorspronkelijke scope en `CLAUDE.md` voor
de projectinstructies.

## 🔨 Openstaande features
- (geen) — Stripe staat in de PRD-roadmap, niet als losse backlog-taak.

## 🤔 Beslissingen die nog open staan
- (geen openstaand)

## ❌ Bewust niet doen
- **Grid-modus per map (G1–G3)** — gedescoped 2026-06-19, zie PRD §4.4.
- **Camera-album-vastloper** — eenmalig gebleken, niet verder onderzoeken.
- **e2e-tests door de echte loginflow** — gedescoped 2026-06-23. MSAL-popup tegen
  echte Microsoft-accounts is niet betrouwbaar te automatiseren (bot-detectie,
  2FA, credentials in CI). Reproduceerbare schermen halen we uit de
  screenshot-harness (zie afgerond) i.p.v. echte e2e.
- **Standaarddrempels "Vind vergelijkbare"** — besloten 2026-06-23: huidige
  `vorm ≤12 / kleur ≥0.78` blijven; niet verruimen.

## ✅ Recent afgerond
- **Screenshot-harness (marketing)**: dev-only `?harness=<view>` (zie
  `src/harness/`) rendert losse schermen — Triage (desktop + mobiel/touch),
  OrganizeHome, Slim sorteren-dashboard en cluster-grid — met nep-data, zónder
  login of Graph. Foto's met ingebouwde thumbnail-URL → geen netwerk; een
  dev-only Vite-middleware serveert de demo-foto's uit `e2e/mock-photos/` op
  `/mock/*` (bewust níét in `public/`, dus niet in de productiebuild). Een
  fetch-shim in de harness levert nep-mappen aan FolderSidebar. `npm run
  screenshots` schrijft naar `e2e/screenshots/`. Valt in productie volledig weg
  (`import.meta.env.DEV` in `main.tsx`).
- **PWA (desktop-first, iOS meeliftend)**: `vite-plugin-pwa` (Workbox) genereert
  manifest + service worker. Folder-glyph-iconen (wit op systemBlue) in `public/`
  (192/512/maskable/apple-touch-180). SW precacht alleen de app-shell; Graph-API,
  `/api/*` en thumbnails blijven network-only (`navigateFallbackDenylist`). iOS-meta's
  + `apple-touch-icon` in `index.html`. `staticwebapp.config.json`: PWA-bestanden
  uitgesloten van de SPA-rewrite, `.webmanifest`-MIME, assets cachebaar (SW/index
  `no-store`). `cacheLocation` → `localStorage` (ingelogd blijven). Popup-login
  bewust ongewijzigd (werkt op desktop-PWA's).
  ✅ Geverifieerd: na deploy geïnstalleerd en werkt naar tevredenheid (2026-06-24).
- **Video-support (T9)**: 3e kaart "Video's opruimen" in OrganizeHome → eigen
  `VideoTriageView` met `<video controls>`-speler (bron on-demand via
  `getItemDownloadUrl`, thumbnail als poster). Datalaag: `getFolderVideos` +
  gedeelde `streamFolderItems`-paginering, `video`-facet op `DriveItem`.
  Bewust géén swipe (botst met afspeelbediening) en géén "vind vergelijkbare".
  Verwijderen/verplaatsen/undo/presets identiek aan de foto-triage.
  ✅ Handmatig getest op desktop + mobiel met echte OneDrive-video's (werkt).
- **Logging uitgebreid (dekking + filterbaar)**: `logService` kreeg een `scope`
  (app/auth/triage/smartsort/similar/paywall/graph) + optioneel `durationMs`, met
  een `createLogger(scope)`-factory; het Logboek (`LogView`) kreeg scope-filterchips
  en een duur-kolom. Aanroepen toegevoegd in: triage (verwijderen/verplaatsen/undo
  + foutpaden), Slim sorteren (analyse start/eind met aantallen + duur, geocoding-
  samenvatting, bulk-verplaatsen met succes/mislukt + duur, categorie overslaan,
  cluster-triage), login/registratie/uitloggen, en paywall (gratis limiet bereikt).
  Bestaande `logInfo/Warn/Error` blijven werken (scope `app`).
- **"Vind vergelijkbare" overal**: geëxtraheerd naar de hook `useFindSimilar` +
  gedeelde UI, en toegevoegd aan ClusterTriageView (Slim sorteren).
- Logmodule + Logboek-tab in het beheervenster.
- Buildnummer (`0.<aantal commits>`) linksboven.
- "Vind vergelijkbare": fijner kleurhistogram, robuuste scan (timeout/try-catch),
  selectie in de resultaten-sheet, niets-gevonden-banner, schuifwaarden + beste
  vorm/kleur van de laatste scan.
- Playwright ingericht (landing-screenshot + rooktest).
