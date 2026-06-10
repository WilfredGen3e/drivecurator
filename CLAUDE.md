# DriveCurator — Claude Code Instructies

## Wat is DriveCurator?
DriveCurator is een Azure Static Web App waarmee gebruikers snel en efficiënt hun persoonlijke OneDrive foto's kunnen opschonen. Gebruikers loggen in met hun eigen Microsoft account (outlook.com / hotmail.com) en kiezen tussen twee modi:

- **Handmatig organiseren** — foto's één voor één beoordelen via swipe-interface, verwijderen of verplaatsen naar map
- **Slim sorteren** — de app analyseert alle foto's automatisch en groepeert ze in categorieën (locatie/vakantie, schermafbeeldingen, WhatsApp, maandelijks, burst-reeksen, duplicaten); hele groepen in één keer verplaatsen

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

DriveCurator volgt de **Microsoft Fluent Design** stijl, vergelijkbaar met onedrive.live.com. Vertrouwd voor OneDrive-gebruikers, maar met eigen identiteit.

### Kleuren

```css
/* Primair */
--color-accent:        #0078d4;   /* Microsoft blauw — knoppen, links, actieve states */
--color-accent-hover:  #106ebe;   /* Donkerder blauw voor hover */
--color-accent-light:  #deecf9;   /* Lichtblauw voor geselecteerde items */

/* Achtergronden */
--color-bg-primary:    #ffffff;   /* Hoofdachtergrond */
--color-bg-secondary:  #f5f5f5;   /* Zijbalk, header */
--color-bg-hover:      #edebe9;   /* Hover state op rijen/items */
--color-bg-selected:   #deecf9;   /* Geselecteerd item */

/* Tekst */
--color-text-primary:  #201f1e;   /* Hoofdtekst */
--color-text-secondary:#605e5c;   /* Subtekst, labels */
--color-text-disabled: #a19f9d;   /* Uitgeschakeld */

/* Borders */
--color-border:        #edebe9;   /* Standaard border */
--color-border-strong: #c8c6c4;   /* Zichtbare border */

/* Semantisch */
--color-danger:        #d13438;   /* Verwijderen */
--color-danger-light:  #fde7e9;   /* Verwijder-hover achtergrond */
--color-success:       #107c10;   /* Bewaren/bevestigen */
--color-success-light: #dff6dd;   /* Bewaar-hover achtergrond */
```

### Typografie

```css
font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;

/* Groottes */
--font-size-xs:   12px;   /* Labels, metadata */
--font-size-sm:   14px;   /* Standaard UI tekst */
--font-size-base: 16px;   /* Body */
--font-size-lg:   18px;   /* Sectietitels */
--font-size-xl:   24px;   /* Paginatitels */

/* Gewichten */
font-weight: 400;   /* Body tekst */
font-weight: 600;   /* Koppen, labels */
```

### Componenten

**Knoppen**
```css
/* Primaire knop */
background: #0078d4;
color: #ffffff;
border: none;
border-radius: 2px;
padding: 6px 16px;
font-size: 14px;
font-weight: 600;

/* Secundaire knop */
background: #ffffff;
color: #201f1e;
border: 1px solid #8a8886;
border-radius: 2px;

/* Destructief (verwijderen) */
background: #d13438;
color: #ffffff;

/* Hover: gebruik --color-accent-hover of --color-bg-hover */
```

**Topbar / commandobalk**
```css
background: #ffffff;
border-bottom: 1px solid #edebe9;
height: 48px;
padding: 0 16px;
```

**Zijbalk**
```css
background: #f5f5f5;
border-right: 1px solid #edebe9;
width: 220px;
```

**Foto-grid items**
```css
border-radius: 2px;
border: 1px solid transparent;
/* Bij hover: */
border-color: #edebe9;
background: #f5f5f5;
```

**Geselecteerd item**
```css
background: #deecf9;
border-color: #0078d4;
```

### Donker thema

DriveCurator ondersteunt ook een donker thema via een `data-theme="dark"` attribuut op `<body>`.

```css
[data-theme="dark"] {
  --color-bg-primary:    #1b1a19;
  --color-bg-secondary:  #252423;
  --color-bg-hover:      #323130;
  --color-bg-selected:   #004578;
  --color-text-primary:  #f3f2f1;
  --color-text-secondary:#c8c6c4;
  --color-border:        #323130;
  --color-border-strong: #484644;
  --color-accent:        #479ef5;
  --color-accent-hover:  #62abf5;
}
```

### Wat te vermijden
- ❌ Geen afgeronde hoeken groter dan `4px` (Fluent gebruikt scherpe hoeken)
- ❌ Geen zware schaduwen — alleen subtiele `box-shadow: 0 1px 2px rgba(0,0,0,0.1)`
- ❌ Geen felle of niet-Microsoft kleuren als accent
- ❌ Geen andere fonts dan Segoe UI / system-ui
- ❌ Geen gradient achtergronden
- ✅ Veel witruimte
- ✅ Vlakke, functionele UI — de foto's zijn het middelpunt

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
│   │   └── useIsTouch.ts              — detecteert touch-apparaat
│   ├── components/
│   │   ├── LandingPage.tsx            — startpagina vóór login (vervangt het oude LoginScreen)
│   │   ├── BlockedScreen.tsx          — paywall / geblokkeerd scherm
│   │   ├── PaywallModal.tsx           — upgrade-modal bij limietbereik
│   │   ├── AdminPortal.tsx            — beheerdersinzicht (alleen admin-account)
│   │   ├── OrganizeHome.tsx           — keuze tussen handmatig en slim sorteren
│   │   ├── FolderBrowser.tsx          — mapnavigatie vóór triage/analyse
│   │   ├── FolderSidebar.tsx          — sidebar: mappen + verplaats-knop
│   │   ├── TriageView.tsx             — handmatige triage: foto voor foto
│   │   ├── SmartSortView.tsx          — slim sorteren: analyse + categorie-dashboard
│   │   ├── ClusterTriageView.tsx      — triage binnen één cluster (swipe + knoppen)
│   │   └── UndoToast.tsx              — undo-notificatie
│   ├── App.tsx                        — root component, routing tussen schermen
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
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
- TriageView: foto voor foto, sidebar links + foto rechts
  - `large` thumbnail (800×800px), fallback naar `medium`
  - Metadata: bestandsnaam, datum (EXIF of aanmaakdatum), camera, bestandsgrootte
  - Knoppen: ← Vorige | 🗑 Verwijderen | → Volgende | map-selector in sidebar
  - Touch: swipe links = verwijderen, swipe rechts = volgende, swipe omhoog = verplaatsen
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

### 🔒 Fase 3 — Nog niet bouwen
- Grid-modus, bulk selectie, toetsenbordshortcuts, video support
- Persistente sessie, favoriete startmap
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
