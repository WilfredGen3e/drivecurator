# DriveCurator

Snel je OneDrive foto's opschonen via een swipe-interface. Inloggen met je eigen Microsoft account, foto's beoordelen, bewaren of verwijderen — zonder het pieterpeuterige selecteer-gedoe van OneDrive zelf.

## Features (Fase 1)
- 🔐 Inloggen met persoonlijk Microsoft account (OneDrive)
- 📁 Mapnavigatie door je OneDrive
- 👆 Swipe of klik: bewaren of verwijderen
- ↩️ Undo: laatste actie ongedaan maken
- 🗑️ Verwijderen gaat naar OneDrive prullenbak (herstelbaar)
- 📊 Voortgangsindicator (foto 12 van 143)

## Lokaal starten

### Vereisten
- Node.js 18+
- npm 9+
- Azure App Registration (zie setup hieronder)

### Installatie
```bash
git clone https://github.com/jouw-gebruikersnaam/drivecurator
cd drivecurator
npm install
cp .env.example .env.local
```

Vul `VITE_MSAL_CLIENT_ID` in `.env.local` in (zie Azure Setup).

```bash
npm run dev
```

App draait op `http://localhost:5173`

---

## Azure Setup (eenmalig)

### 1. App Registration aanmaken
1. Ga naar [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App Registrations** → **New registration**
2. Naam: `DriveCurator`
3. Account type: `Accounts in any organizational directory and personal Microsoft accounts`
4. Redirect URI: `Single-page application (SPA)` → `http://localhost:5173`
5. Klik **Register**
6. Kopieer de **Application (client) ID** → zet in `.env.local` als `VITE_MSAL_CLIENT_ID`
7. Ga naar **API Permissions** → **Add permission** → **Microsoft Graph** → **Delegated**
   - `Files.ReadWrite`
   - `User.Read`
   - `offline_access`

### 2. Redirect URI toevoegen voor productie
In de App Registration → **Authentication** → voeg toe:
- `https://drivecurator.azurestaticapps.net`

### 3. Azure Static Web App aanmaken
1. Ga naar [portal.azure.com](https://portal.azure.com) → **Static Web Apps** → **Create**
2. Koppel aan je GitHub repo `drivecurator`
3. Framework: `React` · App location: `/` · Output: `dist`
4. Na aanmaken: **Configuration** → voeg toe:
   - `VITE_MSAL_CLIENT_ID` = jouw client ID

---

## Deployment
Elke push naar `main` deployt automatisch via GitHub Actions naar Azure.

```bash
git push origin main
# → GitHub Actions bouwt en deployt automatisch
```

---

## Tech Stack
- React 18 + TypeScript
- MSAL.js v3 (`@azure/msal-browser`)
- Microsoft Graph API v1.0
- Zustand (state management)
- Tailwind CSS
- Vite
- Azure Static Web Apps

## Licentie
Privé — alle rechten voorbehouden. Toekomstige commerciële licentie voorzien.
