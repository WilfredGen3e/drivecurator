# DriveCurator — Claude Code Instructies

## Wat is DriveCurator?
DriveCurator is een Azure Static Web App waarmee gebruikers snel en efficiënt hun persoonlijke OneDrive foto's kunnen opschonen. Gebruikers loggen in met hun eigen Microsoft account (outlook.com / hotmail.com) en kiezen tussen twee modi:

- **Handmatig organiseren** — foto's één voor één beoordelen via swipe-interface, verwijderen of verplaatsen naar map
- **Slim sorteren** — de app analyseert alle foto's automatisch en groepeert ze in categorieën (locatie/vakantie, schermafbeeldingen, WhatsApp, maandelijks, burst-reeksen, duplicaten); hele groepen in één keer verplaatsen
- **Video's opruimen** — video's één voor één bekijken in een `<video>`-speler, verwijderen of verplaatsen naar map

## Doelplatform — mobiel én desktop
DriveCurator wordt op **zowel mobiel/touch (iPhone, iPad) als desktop** gebruikt;
beide zijn volwaardig ondersteund. Het verschil zit in de **weergave**: op mobiel
krijgen sommige onderdelen een aangepaste, compactere layout. Test UI-wijzigingen
dus op beide. Concreet schakelt de shell onder `lg` (1024px) naar compacte varianten:
header-acties (naam · Beheer · Uitloggen) in een avatar-menu, en de stappenbalk toont
dan alleen de huidige stap. Triage heeft een aparte touch-layout (zie `useIsTouch`).

## Repo & Deployment
- **GitHub repo:** `https://github.com/WilfredGen3e/drivecurator`
- **Lokaal:** `/Users/stefan/git/drivecurator`
- **Hosting:** Azure Static Web App
- **CI/CD:** Elke push naar `main` deployt automatisch via GitHub Actions
- **URL:** `https://drivecurator.azurestaticapps.net`

---

## Technische Stack — NIET AFWIJKEN
| Onderdeel | Keuze |
|-----------|-------|
| Framework | React 18 + TypeScript |
| Auth | MSAL.js v3 (`@azure/msal-browser`) |
| API | Microsoft Graph API v1.0 |
| State | Zustand |
| Styling | Tailwind CSS |
| Build | Vite |
| Hosting | Azure Static Web Apps |

**Verboden afwijkingen:**
- ❌ Geen backend, server of API routes toevoegen
- ❌ Geen extra npm packages zonder expliciete toestemming
- ❌ Niet overstappen naar andere auth library dan MSAL
- ❌ Geen database of serverside opslag
- ❌ Geen Next.js, Remix of andere frameworks
- ❌ Geen environment secrets hardcoden in code

---

## Stijlgids — DriveCurator

DriveCurator volgt een **Apple-geïnspireerde stijl** (iOS/macOS Human Interface
Guidelines): rustig, verfijnd, met ruime afronding, het SF-systeemfont en zachte
diepte. Doel: een gebruiker moet denken "dit lijkt door Apple gemaakt". De foto's
blijven het middelpunt; de UI eromheen is licht en terughoudend.

> Historisch volgde de app Microsoft Fluent. Dat is bewust losgelaten
> (zie gespreksbeslissing 2026-06-21). De Tailwind-tokens heten nog `fluent.*`
> om een grote rename te vermijden — de **waarden** zijn Apple-systeemkleuren.

### Bronnen van waarheid
- **Kleuren/diepte:** CSS-variabelen in `src/index.css` (`:root` + dark).
- **Tokens:** `tailwind.config.js` (`fluent.*` kleuren, `borderRadius`, `boxShadow`).
- **Knoppen:** altijd `src/components/ui/Button.tsx` gebruiken — geen losse knop-classes.

### Kleuren (Apple system colors)

```css
/* Primair — systemBlue */
--color-accent:        #007aff;   /* knoppen, links, actieve states */
--color-accent-hover:  #0066d6;
--color-accent-light:  #e9f2ff;   /* getinte vulling / geselecteerd */

/* Achtergronden */
--color-bg-primary:    #ffffff;   /* kaarten / voorgrond */
--color-bg-secondary:  #f2f2f7;   /* systemGroupedBackground */
--color-bg-hover:      #e5e5ea;
--color-bg-selected:   #e9f2ff;

/* Tekst */
--color-text-primary:  #1c1c1e;   /* label */
--color-text-secondary:#6e6e73;   /* secondaryLabel */
--color-text-disabled: #aeaeb2;

/* Borders / scheidingslijnen */
--color-border:        #e5e5ea;
--color-border-strong: #c6c6c8;

/* Semantisch */
--color-danger:        #ff3b30;   /* systemRed — verwijderen */
--color-success:       #34c759;   /* systemGreen — bewaren */

/* Diepte (zacht, iOS-achtig) */
--shadow-card:  0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06);
--shadow-float: 0 8px 30px rgba(0,0,0,0.12);
```

Dark mode-waarden staan naast deze in `src/index.css` (o.a. systemBlue `#0a84ff`,
zacht zwart `#000000`/`#1c1c1e`). De app gebruikt het zachte Apple-zwart
`var(--color-canvas)` als triage-achtergrond (niet meer hardgecodeerd `#080809`).

### Typografie

```css
/* SF Pro op Apple-apparaten, met nette fallbacks */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display',
  system-ui, 'Segoe UI', Roboto, sans-serif;
-webkit-font-smoothing: antialiased;

font-weight: 400;   /* body */
font-weight: 600;   /* koppen, labels, knoppen */
```

### Afronding

| Element            | Radius        | Tailwind        |
|--------------------|---------------|-----------------|
| Knoppen, chips     | 12px          | `rounded-xl`    |
| Kaarten            | 16px          | `rounded-2xl`   |
| Bottom-sheets      | 22px (boven)  | `rounded-t-3xl` |
| Pillen / avatars   | vol rond      | `rounded-full`  |

### Animaties (subtiel, Apple-achtig)

Gedefinieerd in `src/index.css` (respecteren `prefers-reduced-motion`):

| Utility         | Gebruik                                        |
|-----------------|------------------------------------------------|
| `animate-rise`  | kaarten/modals zacht laten opkomen bij mount   |
| `animate-fade`  | overlay-backdrops laten infaden                |
| `animate-sheet` | bottom-sheets vanaf onder laten inschuiven     |
| `active:scale-[0.97]` | indruk-feedback (zit al in `<Button>`)   |

Houd het ingetogen: geen lange of opvallende animaties.

### Knoppen — gebruik altijd `<Button>`

```tsx
import Button from './ui/Button'

<Button variant="primary">Volgende</Button>
<Button variant="destructive" icon={<TrashIcon/>}>Verwijderen</Button>
<Button variant="secondary" size="sm">Wijzigen</Button>
<Button variant="ghost">Annuleren</Button>
```

Varianten: `primary` (gevuld accent) · `secondary` (getinte vulling) ·
`neutral` (grijze vulling) · `success` (gevuld groen, bewaren/volgende) ·
`destructive` (gevuld rood) · `ghost` (alleen tekst).
Alle knoppen: min. **44px** tikdoel (iOS), `rounded-xl`, subtiele `active:scale`
indruk-animatie. Op mobiel hoofdacties bij voorkeur `fullWidth` of `flex-1`.

In de triage-actiebalk komen de kleuren overeen met de swipe-richtingen:
**Verwijder = `destructive`**, **Verplaats = `primary`**, **Volgende = `success`**.

### Wat te vermijden
- ❌ Geen losse knop-classes meer — alles via `<Button>`.
- ❌ Geen scherpe 2px-hoeken; gebruik de afrondingsschaal hierboven.
- ❌ Geen Microsoft Fluent-kleuren (`#0078d4` e.d.) — gebruik de tokens.
- ❌ Geen andere fonts dan de SF-stack hierboven.
- ❌ Geen `onMouseEnter`-only effecten — touch heeft geen hover; gebruik `active:`-states.
- ❌ Geen onderste balk zonder safe-area — gebruik `.pb-safe` op sticky/bottom-balken.
- ✅ Ruime witruimte, weinig scheidingslijnen, zachte schaduwen.
- ✅ De foto's zijn het middelpunt — UI eromheen blijft terughoudend.

---

## Authenticatie
- Library: `@azure/msal-browser` v3
- Authority: `https://login.microsoftonline.com/consumers` — uitsluitend persoonlijke Microsoft accounts (outlook.com, hotmail.com, live.com).
- Scopes: `Files.ReadWrite`, `User.Read`, `offline_access`
- Login via popup (`loginPopup`), niet redirect
- Client ID komt uit `VITE_MSAL_CLIENT_ID` in `.env.local` (nooit committen)
- Azure App Registration: platform type = **Single-page application (SPA)**, niet Web
- Client ID: `42aaa073-c678-4a5c-afba-6b54c6a2dac0`
- Redirect URI's: `http://localhost:5173` (dev) en productie-URL

---

## API — Azure Functions

De `api/` map bevat Azure Functions die automatisch worden meegedeployd met de Static Web App.

### Endpoints
| Method | Pad | Beschrijving |
|--------|-----|-------------|
| POST | `/api/register` | Maak gebruiker aan of update bestaande. Geeft gebruikersobject terug. Aanroepen na elke login. |
| GET | `/api/me` | Haal huidige gebruiker op (status, limiet, premium). |
| POST | `/api/usage` | Verhoog triage-teller met 1. Geeft 403 terug als gratis limiet bereikt is. |

### Auth
Alle endpoints verwachten een geldig MSAL access token als `Authorization: Bearer <token>`. Het token wordt gevalideerd via een Graph API call (`/me`).

### Database
Azure Table Storage — tabel `users`:
- **PartitionKey**: `"user"` (vast)
- **RowKey**: Microsoft account ID (OID)
- **Velden**: displayName, email, photosTriaged, isPremium, isAdmin, createdAt

### Rollen
- `isAdmin: true` → `stefansiemerink@outlook.com` — onbeperkt, geen paywall
- `isPremium: true` → betaalde gebruiker — onbeperkt
- Gratis gebruiker → maximaal 200 foto's (`FREE_TIER_LIMIT` in `api/shared/userDto.js`)

### Gedeelde code
```
api/shared/
├── auth.js        — token verificatie via Graph API
├── tableClient.js — Table Storage verbinding
└── userDto.js     — FREE_TIER_LIMIT, ADMIN_EMAILS, toUserDto()
```

### Lokaal draaien
Zie `STORAGE_SETUP.md` voor de volledige instructies. Vereist `api/local.settings.json` met `AZURE_STORAGE_CONNECTION_STRING`.

---

## Bestandsstructuur
```
drivecurator/
├── api/
│   ├── register/          — POST /api/register
│   ├── me/                — GET /api/me
│   ├── usage/             — POST /api/usage
│   ├── shared/
│   │   ├── auth.js        — token verificatie via Graph API
│   │   ├── tableClient.js — Table Storage verbinding
│   │   └── userDto.js     — FREE_TIER_LIMIT, ADMIN_EMAILS, toUserDto()
│   ├── host.json
│   └── package.json
├── public/
├── src/
│   ├── auth/
│   │   └── msalConfig.ts              — MSAL config + loginRequest scopes
│   ├── services/
│   │   ├── graphService.ts            — alle Graph API calls
│   │   ├── clusterService.ts          — GPS-clustering + Nominatim geocoding; exporteert getPhotoDate + isScreenshot
│   │   ├── analysisService.ts         — foto-analyse: clusters, burst, duplicaten, maandgroepen
│   │   ├── apiService.ts              — calls naar /api/* (register, me, usage)
│   │   └── eventService.ts            — Wikidata-events per locatiecluster (IJskast: uitgecommentarieerd)
│   ├── store/
│   │   └── useAppStore.ts             — Zustand global state
│   ├── hooks/
│   │   ├── useIsTouch.ts              — detecteert touch-apparaat
│   │   └── useFindSimilar.ts          — gedeelde "vind vergelijkbare"-logica
│   ├── components/
│   │   ├── ui/
│   │   │   └── Button.tsx             — centrale Apple-stijl knop (altijd gebruiken)
│   │   ├── LandingPage.tsx            — publieke startpagina (lichte Apple-look)
│   │   ├── BlockedScreen.tsx          — geblokkeerd scherm
│   │   ├── PaywallModal.tsx           — upgrade-modal bij limietbereik
│   │   ├── AdminPortal.tsx            — beheerdersinzicht (alleen admin-account)
│   │   ├── LogView.tsx                — client-side logboek (in beheerportal)
│   │   ├── StepIndicator.tsx          — stappenbalk (mobiel: alleen huidige stap)
│   │   ├── OrganizeHome.tsx           — keuze tussen handmatig en slim sorteren
│   │   ├── FolderBrowser.tsx          — mapnavigatie vóór triage/analyse
│   │   ├── FolderSidebar.tsx          — sidebar: mappen + verplaats-knop
│   │   ├── PhotoStackLoader.tsx       — laad-animatie (fotostapel)
│   │   ├── TriageView.tsx             — handmatige triage: foto voor foto
│   │   ├── VideoTriageView.tsx        — video-triage: <video>-speler, on-demand afspeel-URL (geen swipe/vind-vergelijkbare)
│   │   ├── SmartSortView.tsx          — slim sorteren: analyse + categorie-dashboard
│   │   ├── ClusterGridView.tsx        — bulk-grid binnen één cluster
│   │   ├── ClusterTriageView.tsx      — triage binnen één cluster (swipe + knoppen)
│   │   ├── SimilarPhotosSheet.tsx     — sheet met gevonden vergelijkbare foto's
│   │   ├── findSimilarUI.tsx          — gedeelde UI voor "vind vergelijkbare"
│   │   └── UndoToast.tsx              — undo-notificatie
│   ├── harness/                       — DEV-ONLY screenshot-harness (geen login/Graph)
│   │   ├── Harness.tsx                — rendert losse schermen met nep-data + fetch-shim voor nep-mappen
│   │   └── mockData.ts                — nep-foto's, -mappen, -account, -AnalysisResult
│   ├── App.tsx                        — root component, routing tussen schermen
│   ├── main.tsx                       — entry; ?harness=<view> in dev → Harness (valt weg in prod-build)
│   ├── index.css
│   └── vite-env.d.ts
├── e2e/
│   ├── landing.spec.ts                — landing-rooktest + marketing-screenshot
│   ├── marketing.spec.ts              — harness-screenshots (triage/organize/smartsort/cluster)
│   ├── mock-photos/                   — demo-foto's, dev-only geserveerd op /mock/* (NIET in dist/)
│   └── screenshots/                   — output voor de website
├── CLAUDE.md
├── PRD.md
├── .env.example
├── .env.local                         — bevat VITE_MSAL_CLIENT_ID (niet gecommit)
├── staticwebapp.config.json
├── package.json
└── vite.config.ts
```

---

## Hoe de app werkt

### Schermflow
```
LandingPage → LoginScreen → OrganizeHome
                                ├── Handmatig → FolderBrowser → TriageView
                                ├── Video's opruimen → [getFolderVideos] → VideoTriageView
                                └── Slim sorteren → SmartSortView
                                                        ├── FolderBrowser (mapkeuze)
                                                        ├── [analyse + geocoding]
                                                        ├── Dashboard (6 categorieën)
                                                        ├── Categorie-overzicht (cluster-kaarten)
                                                        └── ClusterTriageView (per cluster)
```

### 1. LandingPage / LoginScreen
- LandingPage is de publieke startpagina (uitleg, voordelen)
- LoginScreen toont "Inloggen met Microsoft" knop
- Na succesvolle `loginPopup()` → `apiService.register()` aanroepen → OrganizeHome
- App.tsx beheert de globale auth-state

### 2. OrganizeHome
- Keuze tussen twee modi: Handmatig organiseren of Slim sorteren
- Geen verdere logica — puur navigatie

### 3. Handmatige triage (FolderBrowser → TriageView)
- FolderBrowser: navigatie door OneDrive-mappen met breadcrumb
- "Start in [map]" → `getFolderContents()` met lazy loading:
  - Eerste 200 foto's → direct triage starten
  - Rest → `appendPhotos()` op de achtergrond
- TriageView heeft twee layouts (via `useIsTouch`):
  - **Touch (iPhone/iPad, de standaard):** foto vult het scherm, daaronder één
    bedieningspaneel met 3 grote acties — **Verwijder** (rood) · **Verplaats**
    (blauw) · **Volgende** (groen) — plus twee grijze pillen (Ongedaan · Vorige)
    en een compacte "Vind vergelijkbare". Doelmappen verschijnen via een bottom-sheet.
  - **Desktop:** foto rechts, mappen-sidebar links — volwaardige eigen layout.
  - `large` thumbnail (800×800px), fallback naar `medium`
  - Metadata: bestandsnaam, datum (EXIF of aanmaakdatum), camera, bestandsgrootte
  - Touch-gebaren: swipe links = verwijderen, swipe rechts = volgende, swipe omhoog = verplaatsen
  - Verwijder-/Volgende-/Verplaats-kleuren komen overeen met de swipe-richtingen
  - Verwijderen → OneDrive prullenbak (niet permanent)
  - Undo verplaatsen werkt; undo verwijderen is niet mogelijk via API

### 4. Slim sorteren (SmartSortView)
- **Stap 1 — Mapkeuze:** FolderBrowser, zelfde als handmatig
- **Stap 2 — Analyse:** `analyzePhotos()` in `analysisService.ts`
  - Alle foto's worden in één keer opgehaald (alle pagina's)
  - Detectie van 6 categorieën (zie hieronder)
  - Nominatim geocoding voor locatie-clusters (max 1 req/sec)
  - Voortgangsindicator tijdens laden + geocoding
- **Stap 3 — Dashboard:** 6 categorie-kaarten met tellers
- **Stap 4 — Categorie:** lijst van clusters/sets als kaarten, elk met thumbnails
  - "Verplaatsen naar…" → bottom sheet met FolderSidebar → bulk move (5 parallel workers)
  - "Triagen" → ClusterTriageView voor die cluster
  - "Overslaan" → cluster uit de lijst verwijderen
- **Stap 5 — ClusterTriageView:** zelfde swipe-interface als handmatige triage, maar binnen één cluster

### 5. FolderSidebar
- Eigen navigatiestate, herbruikbaar in zowel handmatige triage als SmartSortView
- Klik op map → navigeer erin; `→` knop → verplaats huidige foto
- Breadcrumb voor terugnavigeren
- "+ Nieuwe map" (alleen binnen een map, niet in root); inline invoer, Enter = aanmaken

---

## Analyse-logica

### analysisService.ts — `analyzePhotos(photos)`
Geeft een `AnalysisResult` terug met:

| Veld | Beschrijving |
|------|-------------|
| `locationClusters` | GPS-clusters via `clusterService`, geocoded via Nominatim |
| `screenshots` | Herkend op bestandsnaam (`screenshot`, `schermafbeelding`) of PNG zonder cameraMake |
| `whatsapp` | Herkend op bestandsnaam (`IMG-*-WA*`, `wa\d{4}`, `whatsapp`, `instagram`, `snapchat`, `tiktok`) |
| `monthlyGroups` | Camera-foto's zonder GPS, gegroepeerd per jaar-maand |
| `burstSets` | 3+ foto's van dezelfde camera binnen 3 seconden van elkaar |
| `duplicateSets` | Foto's met exact dezelfde `takenDateTime` (afgekapt op seconde) |

### clusterService.ts — `clusterPhotos(photos)`
- GPS-foto's worden gesorteerd op datum en greedy geclusterd
- Twee foto's zitten in dezelfde cluster als: tijdkloof ≤ 7 dagen én afstand ≤ 75 km (Haversine)
- Clusters kleiner dan 3 foto's gaan naar "Overig"
- `geocodeClusters()` verrijkt clusters met plaatsnaam via Nominatim reverse geocoding

### ClusterType
```typescript
type ClusterType = 'location' | 'screenshots' | 'whatsapp' | 'monthly' | 'other' | 'burst' | 'duplicate'
```

---

## Graph API — Belangrijke details

### Endpoints in gebruik
```
GET  /me/drive/root/children                                    — root mappen
GET  /me/drive/items/{id}/children                              — submappen
GET  /me/drive/items/{id}/children?$expand=thumbnails&$top=200  — foto's + thumbnails
DELETE /me/drive/items/{id}                                     — naar prullenbak
PATCH  /me/drive/items/{id}  { parentReference: { id } }       — verplaatsen
POST   /me/drive/items/{id}/children  { name, folder: {} }     — map aanmaken
```

### Paginering
`getFolderContents()` volgt `@odata.nextLink` totdat er geen volgende pagina meer is. Elke pagina = 200 items. Bij tienduizenden foto's zijn dit honderden API calls.

### Thumbnails
- `large` (800×800) wordt gebruikt voor weergave — voldoende scherpte voor beoordeling
- `medium` (176×176) als fallback als `large` niet beschikbaar is
- Thumbnails worden meegeladen via `$expand=thumbnails` in hetzelfde request

### Token
`acquireTokenSilent()` vernieuwt het token automatisch. Geen handmatige token-afhandeling nodig.

---

## Omgeving starten
```bash
cd /Users/stefan/git/drivecurator
npm install
cp .env.example .env.local
# Vul VITE_MSAL_CLIENT_ID in (zie boven)
npm run dev
# → http://localhost:5173
```

---

## Marketing-screenshots (dev-only harness)

Reproduceerbare schermafbeeldingen voor de website, **zonder login of Graph**.

- **Aanroep in de dev-server:** `?harness=<view>` —
  `triage` (voeg `&touch=1` toe voor de mobiele layout), `organize`,
  `smartsort`, `cluster`. Bijv. `http://localhost:5173/?harness=smartsort`.
- **Genereren:** `npm run screenshots` (Playwright) → `e2e/screenshots/`.
- **Hoe het werkt:** `src/harness/` rendert losse componenten met nep-data uit
  `mockData.ts`. Foto's hebben een ingebouwde thumbnail-URL, dus er gaat geen
  Graph-call uit; een fetch-shim levert nep-mappen aan FolderSidebar.
- **Demo-foto's** staan in `e2e/mock-photos/` en worden **alleen in de
  dev-server** geserveerd op `/mock/*` (Vite-plugin `apply: 'serve'`). Bewust
  níét in `public/`, zodat ze niet in de productiebuild (`dist/`) belanden.
- **Productie:** de hele harness valt weg via `import.meta.env.DEV` in
  `main.tsx` — geen nep-auth-achterdeur in de live app. Echte e2e-tests door de
  loginflow zijn bewust gedescoped (zie `BACKLOG.md`).

> Echte foto's gebruiken? Zet JPEG's in `e2e/mock-photos/` en wijs ernaar in
> `PHOTO_FILES` (`mockData.ts`).

---

## Fasering — Status

### ✅ Fase 1 — MVP (gebouwd)
- [x] A1 — Inloggen met Microsoft account via MSAL popup
- [x] A2 — Uitloggen
- [x] M1 — OneDrive mapnavigatie, meerdere niveaus diep, breadcrumb
- [x] T1 — Foto's één voor één weergeven, groot (800×800)
- [x] T2 — Knop verwijderen → OneDrive prullenbak
- [x] T3 — Knop bewaren (volgende foto)
- [x] T4 — Sidebar met mappen + verplaats-knop per map
- [x] T6 — Undo: laatste actie ongedaan maken (move werkt, delete niet via API)
- [x] T7 — Voortgangsindicator (foto 12 van 143+)
- [x] P1 — Verwijderen gaat naar OneDrive prullenbak (niet permanent)
- [x] Extra — Foto-metadata: datum, camera, bestandsgrootte
- [x] Extra — Nieuwe map aanmaken vanuit sidebar
- [x] Extra — Lazy loading: eerste 200 foto's direct, rest op achtergrond

### ✅ Fase 2 — Slim sorteren (gebouwd)
- [x] OrganizeHome — keuze tussen handmatig en slim sorteren
- [x] SmartSortView — volledige analyse + categorie-dashboard
- [x] GPS-clustering met Nominatim geocoding (locatie-clusters)
- [x] Screenshot-detectie (bestandsnaam + PNG-heuristiek)
- [x] WhatsApp/social media-detectie (bestandsnaam)
- [x] Maandelijkse groepen (camera-foto's zonder GPS)
- [x] Burst-reeksen (3+ foto's binnen 3 sec, zelfde camera)
- [x] Duplicaten-detectie (exact zelfde takenDateTime)
- [x] ClusterTriageView — swipe-triage binnen één cluster
- [x] Bulk move — hele cluster in één keer verplaatsen (5 parallel workers)
- [x] LandingPage — publieke startpagina
- [x] Backend (Azure Functions) — gebruikersbeheer, usage-teller, freemium-limiet
- [x] Paywall — gratis limiet van 200 foto's, admin/premium onbeperkt
- [x] AdminPortal — beheerdersoverzicht

### ❌ Bewust niet bouwen (descoped)
- **Grid-modus per map + bulk-selectie (G1-G3)** — descoped 2026-06-19. Triage +
  Slim sorteren dekken de behoefte; zie PRD §4.4. Niet oppakken tenzij expliciet gevraagd.

### ✅ Fase 3 — Video-support (gebouwd)
- [x] T9 — Derde modus "Video's opruimen" in OrganizeHome
- [x] VideoTriageView — `<video controls>`-speler, afspeel-URL on-demand via `getItemDownloadUrl`
- [x] Datalaag — `getFolderVideos` + gedeelde `streamFolderItems`-paginering; `video`-facet op `DriveItem`
- [x] Verwijderen / verplaatsen / undo / preset-mappen (hergebruik foto-triage-patroon)
- Bewust géén swipe (botst met afspeelbediening), géén "vind vergelijkbare" (foto-vingerafdruk)

### ✅ Fase 4 — PWA (gebouwd, desktop-first)
- [x] `vite-plugin-pwa` (Workbox) — manifest + service worker bij elke build
- [x] Folder-glyph-iconen in `public/` (192/512/maskable-512/apple-touch-180), wit op systemBlue
- [x] SW precacht **alleen de app-shell**; Graph-API, `/api/*` en thumbnails network-only (`navigateFallbackDenylist` op `/api/` en `/.auth/`)
- [x] iOS-meta's + `apple-touch-icon` in `index.html` ("Zet op beginscherm" full-screen)
- [x] `staticwebapp.config.json` — PWA-bestanden uitgesloten van SPA-rewrite, `.webmanifest`-MIME, assets cachebaar (SW/index `no-store`)
- [x] `cacheLocation` → `localStorage` (ingelogd blijven tussen sessies)
- Doel = **desktop (Mac/Windows, Chrome/Edge/Safari)**; iOS lift mee. Popup-login bewust ongewijzigd (werkt op desktop-PWA's; iOS-login pas oplossen indien nodig).
- ⏳ Vereist deploy (HTTPS) om installatie te testen.

### 🔒 Nog niet bouwen
- Google Photos integratie, AI-suggesties

---

## Bekende beperkingen
- Undo van verwijderen is niet mogelijk via Graph API (bestand staat in prullenbak, maar herstel vereist gebruikersactie in OneDrive)
- Foto's worden geladen als thumbnail (800px), niet het origineel — voor beoordeling voldoende
- Bij zeer grote mappen (10.000+) duurt het volledig laden enkele minuten; triage start wel direct na de eerste 200

---

## Commerciële Guardrails
- Bouw componenten modulair — geen spaghetti logica in één component
- Scheid auth-logica van business-logica
- Gebruik een `features` config object voor toekomstige feature flags
