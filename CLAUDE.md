# DriveSwipe — Claude Code Instructies

## Wat is DriveSwipe?
DriveSwipe is een Azure Static Web App waarmee gebruikers snel en efficiënt hun persoonlijke OneDrive foto's kunnen opschonen via een swipe-interface. Gebruikers loggen in met hun eigen Microsoft account, zien hun foto's één voor één of in een grid, en kunnen ze verwijderen (naar prullenbak) of in mappen plaatsen.

## Repo & Deployment
- **GitHub repo:** `driveswipe`
- **Hosting:** Azure Static Web App
- **CI/CD:** Elke push naar `main` deployt automatisch via GitHub Actions
- **URL:** `https://driveswipe.azurestaticapps.net`

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

## Authenticatie — Belangrijk
- Gebruik `@azure/msal-browser` v3
- Authority: `https://login.microsoftonline.com/consumers` voor persoonlijke Microsoft accounts
- Scopes: `Files.ReadWrite`, `User.Read`, `offline_access`
- Client ID komt uit `VITE_MSAL_CLIENT_ID` environment variable
- Elke gebruiker logt in met zijn eigen Microsoft account → eigen OneDrive, geen gedeelde data

---

## Bestandsstructuur
```
driveswipe/
├── public/
├── src/
│   ├── auth/
│   │   └── msalConfig.ts
│   ├── services/
│   │   └── graphService.ts
│   ├── store/
│   │   └── useAppStore.ts
│   ├── components/
│   │   ├── LoginScreen.tsx
│   │   ├── FolderBrowser.tsx
│   │   ├── GridView.tsx
│   │   ├── TriageView.tsx
│   │   ├── ActionBar.tsx
│   │   └── UndoToast.tsx
│   ├── App.tsx
│   └── main.tsx
├── CLAUDE.md
├── PRD.md
├── .env.example
├── staticwebapp.config.json
├── package.json
└── vite.config.ts
```

---

## Graph API Endpoints
```
GET    /me/drive/root/children           — root mappen ophalen
GET    /me/drive/items/{id}/children     — map inhoud
GET    /me/drive/items/{id}/thumbnails   — thumbnails
PATCH  /me/drive/items/{id}             — verplaatsen naar andere map
DELETE /me/drive/items/{id}             — naar prullenbak (niet permanent)
```

---

## Fasering — Bouw ALLEEN wat in de actieve fase staat

### ✅ Fase 1 — MVP (nu bouwen)
- [ ] A1 — Inloggen met Microsoft account via MSAL popup
- [ ] A2 — Uitloggen
- [ ] M1 — OneDrive mapnavigatie, map selecteren
- [ ] T1 — Foto's één voor één weergeven, groot
- [ ] T2 — Swipe-links / knop = verwijderen naar prullenbak
- [ ] T3 — Swipe-rechts / knop = bewaren (volgende foto)
- [ ] T4 — Knop = verplaatsen naar map (map-picker)
- [ ] T6 — Undo: laatste actie ongedaan maken
- [ ] T7 — Voortgangsindicator (foto 12 van 143)
- [ ] P1 — Verwijderen gaat naar OneDrive prullenbak (niet permanent)

### 🔒 Fase 2 — Nog niet bouwen
- Grid-modus, bulk selectie, toetsenbordshortcuts, metadata, video support

### 🔒 Fase 3 — Nog niet bouwen
- Persistente sessie, favoriete map, commerciële features

---

## Testplan Fase 1 — Vink af na implementatie

### Unit Tests
- [ ] U1 — `graphService.getFolderContents()` retourneert array van DriveItems
- [ ] U2 — `graphService.deleteItem()` verstuurt DELETE naar juist endpoint
- [ ] U3 — `graphService.moveItem()` verstuurt PATCH met juiste parentReference
- [ ] U4 — Undo-stack draait laatste actie terug
- [ ] U5 — Triage-teller loopt correct op

### Integratie Tests
- [ ] I1 — Inloggen met Microsoft account → token ontvangen, naam zichtbaar
- [ ] I2 — Map ophalen → thumbnails zichtbaar in triage
- [ ] I3 — Foto verwijderen → staat in OneDrive prullenbak
- [ ] I4 — Foto verplaatsen → staat in doelmap
- [ ] I5 — Uitloggen → loginscherm zichtbaar

### UI Tests
- [ ] UI1 — Swipe-links → verwijder-animatie, volgende foto
- [ ] UI2 — Swipe-rechts → bewaar-animatie, volgende foto
- [ ] UI6 — Undo → foto terug in lijst, toast zichtbaar
- [ ] UI7 — Voortgangsteller klopt

### Device Tests
- [ ] R1 — iPhone Safari — swipe werkt met touch
- [ ] R3 — Desktop Chrome/Edge — volledig functioneel

### Edge Cases
- [ ] E1 — Lege map → melding "Geen foto's"
- [ ] E2 — Laatste foto verwijderd → "Map leeg" + terugknop
- [ ] E4 — Sessie verlopen → stille re-auth via MSAL

---

## Definition of Done
Een feature is klaar wanneer:
- [ ] Code geschreven en gecommit op `main`
- [ ] Relevante testcases hierboven afgevinkt
- [ ] Getest met echte OneDrive (persoonlijk Microsoft account)
- [ ] Getest op mobiel (iPhone Safari) én desktop Chrome
- [ ] Geen console errors in `npm run build`
- [ ] Azure Static Web App deployment succesvol

---

## Commerciële Guardrails
Dit is nu een persoonlijke app maar wordt mogelijk commercieel. Houd rekening met:
- Bouw componenten modulair — geen spaghetti logica in één component
- Scheid auth-logica van business-logica (makkelijk later te vervangen door Azure AD B2C)
- Gebruik een `features` config object voor toekomstige feature flags
- Log user actions gestructureerd (console.info voor nu, later te vervangen door analytics)

---

## Omgeving starten
```bash
npm install
cp .env.example .env.local
# Vul VITE_MSAL_CLIENT_ID in
npm run dev
```
