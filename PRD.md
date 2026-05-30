# PRD — DriveSwipe
**Versie:** 1.0  
**Doel:** Een webapp die draait op Azure waarmee gebruikers snel en efficiënt hun OneDrive foto's kunnen opschonen, sorteren en in mappen plaatsen — zonder het frustrerende selecteer-gedoe van OneDrive zelf.

---

## 1. Probleemstelling

OneDrive's standaard interface vereist het selecteren van foto's via kleine checkboxjes, wat bij grote collecties (vakantie, camera roll backup) extreem tijdrovend is. Er bestaat geen snelle "triage" flow om foto's één voor één te beoordelen en direct actie op te ondernemen.

---

## 2. Doelgebruiker

- Primair: eigenaar van de Azure-instantie (jij)
- Uitbreidbaar: iedereen die inlogt met een Microsoft-account krijgt toegang tot zijn/haar eigen OneDrive (multi-user via Microsoft Identity)

---

## 3. Oplossing

Een React-webapp (Azure Static Web App) die via **Microsoft Graph API** verbinding maakt met OneDrive. De gebruiker kan:

1. Inloggen via Microsoft account (MSAL)
2. Een OneDrive-map selecteren om te triagen
3. Foto's één voor één beoordelen in een swipe/triage interface
4. Foto's in bulk bekijken via een grid
5. Acties uitvoeren: verwijderen (prullenbak) of verplaatsen naar map

---

## 4. Features & User Stories

### 4.1 Authenticatie
| ID | User Story | Prioriteit |
|----|-----------|-----------|
| A1 | Als gebruiker wil ik inloggen met mijn Microsoft account zodat mijn eigen OneDrive wordt geladen | Must |
| A2 | Als gebruiker wil ik uitloggen en eventueel wisselen van account | Must |
| A3 | Als gebruiker wil ik dat mijn sessie bewaard blijft (refresh token) | Should |

### 4.2 Mapnavigatie
| ID | User Story | Prioriteit |
|----|-----------|-----------|
| M1 | Als gebruiker wil ik mijn OneDrive mappenstructuur zien en een map selecteren om te triagen | Must |
| M2 | Als gebruiker wil ik nieuwe mappen aanmaken vanuit de app | Should |
| M3 | Als gebruiker wil ik een "favoriete" map instellen als startmap | Could |

### 4.3 Triage-modus (swipe interface)
| ID | User Story | Prioriteit |
|----|-----------|-----------|
| T1 | Als gebruiker wil ik foto's één voor één zien, groot weergegeven | Must |
| T2 | Als gebruiker wil ik met een swipe-links of knop een foto naar de prullenbak sturen | Must |
| T3 | Als gebruiker wil ik met een swipe-rechts of knop een foto bewaren (ongewijzigd laten) | Must |
| T4 | Als gebruiker wil ik met een knop een foto naar een specifieke map verplaatsen | Must |
| T5 | Als gebruiker wil ik via toetsenbordshortcuts navigeren (← → Delete M) | Should |
| T6 | Als gebruiker wil ik de vorige actie ongedaan maken (Undo) | Must |
| T7 | Als gebruiker wil ik zien hoever ik ben (foto 34 van 210) | Must |
| T8 | Als gebruiker wil ik de bestandsnaam, datum en bestandsgrootte zien | Should |
| T9 | Als gebruiker wil ik video's ook kunnen triagen (thumbnail + play) | Should |

### 4.4 Grid-modus
| ID | User Story | Prioriteit |
|----|-----------|-----------|
| G1 | Als gebruiker wil ik een grid-overzicht zien van alle foto's in een map | Must |
| G2 | Als gebruiker wil ik vanuit het grid een foto openen in triage-modus | Must |
| G3 | Als gebruiker wil ik in het grid meerdere foto's selecteren en bulk-verwijderen of bulk-verplaatsen | Should |

### 4.5 Prullenbak & veiligheid
| ID | User Story | Prioriteit |
|----|-----------|-----------|
| P1 | Verwijderde foto's gaan naar de OneDrive prullenbak (herstelbaar, niet permanent) | Must |
| P2 | Als gebruiker wil ik een bevestigingsscherm zien voordat bulk-acties worden uitgevoerd | Must |

---

## 5. Technische Architectuur

```
┌─────────────────────────────────────────┐
│          Azure Static Web App           │
│         (React + TypeScript)            │
│                                         │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │  MSAL Auth  │    │   Graph API     │ │
│  │  Component  │───▶│   Service       │ │
│  └─────────────┘    └────────┬────────┘ │
│                              │          │
│  ┌───────────────────────────▼────────┐ │
│  │           App State (Zustand)      │ │
│  └───┬──────────────┬─────────────────┘ │
│      │              │                   │
│  ┌───▼────┐   ┌─────▼──────┐           │
│  │  Grid  │   │  Triage    │           │
│  │  View  │   │  View      │           │
│  └────────┘   └────────────┘           │
└─────────────────────────────────────────┘
         │
         ▼ Microsoft Graph API
    ┌─────────────┐
    │  OneDrive   │
    │  (per user) │
    └─────────────┘
```

### Stack
| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Framework | React 18 + TypeScript | Stabiel, Azure native support |
| Auth | MSAL.js v3 (@azure/msal-browser) | Microsoft officieel, gratis |
| API | Microsoft Graph API v1.0 | OneDrive toegang |
| State | Zustand | Lichtgewicht, eenvoudig |
| Styling | Tailwind CSS | Snel, responsive |
| Hosting | Azure Static Web Apps | Gratis tier, CI/CD via GitHub |
| Build | Vite | Snel, modern |

### Graph API endpoints gebruikt
```
GET  /me/drive/root/children              — root mappen
GET  /me/drive/items/{id}/children        — map inhoud
GET  /me/drive/items/{id}/thumbnails      — thumbnails
GET  /me/drive/items/{id}/content         — foto download
POST /me/drive/items/{id}/move            — verplaatsen
DELETE /me/drive/items/{id}               — naar prullenbak
```

---

## 6. Azure Setup

### Vereiste stappen (eenmalig)

#### Stap 1 — GitHub Repository
- Maak een nieuwe GitHub repo aan (bijv. `onedrive-photo-manager`)
- Dit is de enige bron van waarheid voor de code
- Elke push naar `main` triggert automatisch een Azure deployment

#### Stap 2 — Azure App Registration
- Aanmaken in Azure Portal → Azure Active Directory → App Registrations
- **Naam:** OneDrive Photo Manager
- **Account type:** `Accounts in any organizational directory and personal Microsoft accounts`  
  *(dit dekt zowel Microsoft 365 family als persoonlijke OneDrive accounts)*
- **Redirect URI:** `https://<jouw-app>.azurestaticapps.net`
- **API permissions:** `Files.ReadWrite`, `User.Read` *(delegated)*
- Noteer de **Client ID** — dit is de enige gedeelde config

> Elke gebruiker logt in met zijn eigen Microsoft account en autoriseert zijn eigen persoonlijke OneDrive. Er is geen gedeelde opslag of admin-account nodig.

#### Stap 3 — Azure Static Web App
- Aanmaken in Azure Portal → Static Web Apps → Create
- **Koppel aan de GitHub repo** (Azure maakt automatisch een GitHub Actions workflow aan)
- Framework preset: `React`
- App location: `/` · Output location: `dist`
- Environment variable toevoegen: `VITE_MSAL_CLIENT_ID=<jouw-client-id>`

#### CI/CD Flow
```
GitHub push → GitHub Actions → Azure Static Web App
     ↑
  lokale dev (npm run dev)
```

#### Stap 4 — CORS
Niet nodig — alle Microsoft Graph API calls gaan direct vanuit de browser van de ingelogde gebruiker.

---

## 7. Bestandsstructuur

```
photo-manager/
├── public/
├── src/
│   ├── auth/
│   │   └── msalConfig.ts          — MSAL configuratie
│   ├── services/
│   │   └── graphService.ts        — alle Graph API calls
│   ├── store/
│   │   └── useAppStore.ts         — Zustand state
│   ├── components/
│   │   ├── LoginScreen.tsx
│   │   ├── FolderBrowser.tsx
│   │   ├── GridView.tsx
│   │   ├── TriageView.tsx
│   │   ├── ActionBar.tsx
│   │   └── UndoToast.tsx
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── package.json
├── vite.config.ts
└── staticwebapp.config.json       — Azure routing
```

---

## 8. Testplan

### 8.1 Unit Tests

| ID | Test | Verwacht resultaat | ✅ |
|----|------|-------------------|---|
| U1 | `graphService.getFolderContents()` retourneert array van DriveItems | Array met name, id, mimeType | ☐ |
| U2 | `graphService.deleteItem()` verstuurt DELETE naar juist endpoint | HTTP 204, item verdwenen uit lijst | ☐ |
| U3 | `graphService.moveItem()` verstuurt PATCH met juiste parentReference | HTTP 200, item in nieuwe map | ☐ |
| U4 | Undo-stack: laatste actie wordt teruggedraaid | Item terug op originele plek | ☐ |
| U5 | Triage-teller loopt correct op (index + 1 per actie) | Teller klopt met positie in array | ☐ |

### 8.2 Integratie Tests (Graph API)

| ID | Test | Verwacht resultaat | ✅ |
|----|------|-------------------|---|
| I1 | Inloggen met Microsoft account via MSAL popup | Token ontvangen, gebruikersnaam zichtbaar | ☐ |
| I2 | Map ophalen met foto's van OneDrive | Grid toont thumbnails | ☐ |
| I3 | Foto verwijderen → checken in OneDrive prullenbak | Foto staat in prullenbak | ☐ |
| I4 | Foto verplaatsen naar map → checken in OneDrive | Foto staat in doelmap | ☐ |
| I5 | Uitloggen → opnieuw laden → loginscherm zichtbaar | Geen cached sessie | ☐ |
| I6 | Family-lid logt in met eigen Microsoft account → ziet zijn eigen persoonlijke OneDrive | Geen data-vermenging tussen accounts | ☐ |

### 8.3 UI / Interactie Tests

| ID | Test | Verwacht resultaat | ✅ |
|----|------|-------------------|---|
| UI1 | Swipe-links op foto → verwijder-animatie speelt, volgende foto verschijnt | Vloeiende animatie, teller +1 | ☐ |
| UI2 | Swipe-rechts op foto → bewaar-animatie, volgende foto | Foto blijft in map | ☐ |
| UI3 | Toets `←` → vorige foto | Navigeert terug | ☐ |
| UI4 | Toets `Delete` → verwijdert huidige foto | Zelfde als swipe-links | ☐ |
| UI5 | Toets `M` → map-picker opent | Mappenlijst zichtbaar | ☐ |
| UI6 | Undo-knop na verwijderen → foto terug in lijst | Toast "Ongedaan gemaakt" | ☐ |
| UI7 | Grid → foto aanklikken → triage opent op die foto | Juiste foto als startpunt | ☐ |
| UI8 | Bulk selectie in grid → verwijderen → bevestigingsdialoog | Dialoog toont aantal geselecteerde foto's | ☐ |

### 8.4 Responsiveness & Device Tests

| ID | Test | Verwacht resultaat | ✅ |
|----|------|-------------------|---|
| R1 | iPhone Safari — triage swipe werkt met touch | Touch events geregistreerd | ☐ |
| R2 | iPad — grid toont 4 kolommen | Layout schaalt correct | ☐ |
| R3 | Desktop Chrome/Edge — volledige functionaliteit | Geen layout-breaks | ☐ |
| R4 | Trage verbinding (3G throttle) — thumbnails laden lazy | Geen blank screens, skeleton loader zichtbaar | ☐ |

### 8.5 Edge Cases

| ID | Test | Verwacht resultaat | ✅ |
|----|------|-------------------|---|
| E1 | Lege map openen | "Geen foto's in deze map" melding | ☐ |
| E2 | Laatste foto in map verwijderen | "Map leeg" scherm, terugknop actief | ☐ |
| E3 | Graph API rate limit (429) | Retry met backoff, gebruiker ziet geen crash | ☐ |
| E4 | Sessie verlopen tijdens triagen | Stille re-auth via MSAL, geen dataverlies | ☐ |
| E5 | Verplaatsen naar map die niet meer bestaat | Foutmelding met suggestie nieuwe map | ☐ |

---

## 9. Definition of Done

Een feature is klaar wanneer:
- [ ] Code geschreven en gecommit
- [ ] Alle relevante unit tests groen
- [ ] Integratie getest met echte OneDrive
- [ ] Getest op mobiel (iPhone Safari) én desktop
- [ ] Geen console errors in productie build
- [ ] PR gereviewd en gemerged naar `main`
- [ ] Azure Static Web App deployment succesvol

---

## 10. Gefaseerde oplevering

### Fase 1 — MVP (Claude Code sprint 1)
- A1, A2 — Login/logout
- M1 — Mapnavigatie
- T1, T2, T3, T4, T6, T7 — Volledige triage-modus
- P1 — Verwijderen naar prullenbak
- Azure deploy werkend

### Fase 2 — Uitbreiding
- G1, G2, G3 — Grid-modus + bulk
- T5 — Toetsenbordshortcuts
- T8 — Metadata weergave
- P2 — Bevestigingsdialoog bulk

### Fase 3 — Nice-to-have
- T9 — Video support
- M2 — Nieuwe mappen aanmaken
- A3 — Persistente sessie
- M3 — Favoriete startmap

---

## 11. Strategische Roadmap — Schaalbaarheid & Commercialisering

### 11.1 Architectuurprincipes vanaf dag 1
Ook al is dit nu een persoonlijke webapp, we bouwen het zo dat opschalen later **geen herarchitectuur** vereist:

| Principe | Hoe we dit nu al doen |
|----------|----------------------|
| **Multi-user by design** | Elke gebruiker logt in met eigen Microsoft account, geen gedeelde state |
| **User-isolated data** | Alle acties lopen via de eigen Graph API token van de gebruiker — nooit via een gedeeld service account |
| **Feature flags klaar** | UI-componenten worden gebouwd met een `features`-config object, zodat betaalde features later aan/uit gezet kunnen worden per gebruiker |
| **Geen vendor lock-in UI** | React componenten zijn cloud-agnostisch — later te draaien op Vercel, AWS Amplify, of eigen server |
| **Logging-ready** | App events (foto verwijderd, map aangemaakt) worden gestructureerd gelogd — klaar voor analytics later |

### 11.2 Commercieel model (toekomst)

**Fase A — Gratis / persoonlijk** *(nu)*
- Onbeperkt gebruik voor ingelogde Microsoft account
- Geen backend, geen kosten

**Fase B — Freemium SaaS** *(later)*
| Tier | Limieten | Prijs |
|------|----------|-------|
| Free | 200 foto's per maand triagen | €0 |
| Pro | Onbeperkt, video support, slimme mappen | €3–5/maand |
| Family | 5 accounts, gedeelde mappen | €7/maand |

**Fase C — Uitbreidingen**
- Google Photos integratie (naast OneDrive)
- AI-suggesties: "deze 23 foto's lijken op duplicaten"
- Bulk exports / ZIP downloads
- White-label voor fotografen (zoals PhotoSort's doelgroep)

### 11.3 Technische stappen voor commercialisering *(niet nu bouwen, wel rekening mee houden)*

```
Huidige architectuur (gratis):
Browser → MSAL → Graph API → OneDrive

Toekomstige architectuur (SaaS):
Browser → Auth (Azure AD B2C of Auth0)
       → Backend API (Azure Functions / Node)
           → Stripe voor betalingen
           → Gebruikersdatabase (usage tracking)
       → Graph API → OneDrive
```

- **Azure AD B2C** vervangt straks MSAL direct — ondersteunt social login (Google, Apple) naast Microsoft
- **Azure Functions** als lichte backend voor: gebruikersbeheer, usage metering, Stripe webhooks
- **Stripe** voor abonnementsbeheer — later toe te voegen zonder de frontend te herbouwen
- De huidige **component-structuur** blijft ongewijzigd — alleen een auth-laag en een paywall-wrapper komen erbij

### 11.4 Wat we nu al slim doen (zonder extra werk)
- Naamkeuze **DriveSwipe** — niet generiek, geen trademark-conflict, domeinnaam waarschijnlijk beschikbaar
- GitHub repo `cloudcull` — publiek te maken als open source met een commerciële licentie later
- Azure Static Web App — schaalt automatisch mee, geen server te beheren
- Microsoft Graph API — dekt 400M+ OneDrive gebruikers wereldwijd als potentiële markt

---

## 12. Azure Kosten Inschatting

| Service | Tier | Kosten |
|---------|------|--------|
| Azure Static Web App | Free | €0/maand |
| Azure App Registration | Gratis | €0 |
| Microsoft Graph API | Gratis (inbegrepen bij Microsoft 365) | €0 |
| **Totaal** | | **€0/maand** |

> Geen backend nodig — alle Graph API calls gaan direct vanuit de browser.

---

*Document klaar voor Claude Code. Elke feature-ID komt overeen met een testplan-ID voor traceerbaarheid.*
