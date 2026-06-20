# DriveCurator — Backlog

Levend overzicht van wat er nog te doen staat. Bijwerken zodra items af zijn of
nieuwe opduiken. Zie `PRD.md` voor de oorspronkelijke scope en `CLAUDE.md` voor
de projectinstructies.

## 🔨 Openstaande features

### Video-support (T9)
Gepland, nog niet gestart. Volledig plan ligt klaar:
- 3e kaart "Video's opruimen" in OrganizeHome (naast Handmatig / Slim sorteren).
- Eigen `VideoTriageView` met `<video>`-afspeler i.p.v. een foto.
- Datalaag: `getFolderContents` verzamelt ook video's; `getItemDownloadUrl()`
  voor de afspeel-URL (on-demand per video).
- Stappen A–E: datalaag → modus-keuze → component → routing → verifiëren.

### "Vind vergelijkbare" overal in triage/sorteer-modi
Akkoord op aanpak. Zit nu alleen in `TriageView`; moet overal terugkomen waar je
in een triage/sorteer-modus zit — concreet: **ClusterTriageView** (Slim sorteren).
Aanpak: logica extraheren naar een herbruikbare hook `useFindSimilar` + gedeelde
UI (`SimilarControls`/`ScanOverlay`/`NoMatchBanner`), `TriageView` ombouwen
(gedrag identiek), daarna `ClusterTriageView` aansluiten. (ClusterGridView valt
af: geen "huidige foto".)

### App als PWA aanbieden
De app installeerbaar maken als PWA. **Eerst uitzoeken wat er nodig is**: web app
manifest (naam, iconen, theme/display), service worker (caching-strategie,
offline-gedrag), installability-criteria, en aandachtspunten rond MSAL-login in
een PWA en de Azure Static Web App-config. Daarna implementeren.

### Logging uitbreiden
De logmodule (logService + Logboek-tab) staat er; nu uitbreiden in dekking.
- **Eerst een plan schrijven: wát willen we allemaal loggen?** Denk aan: triage-
  acties (verwijderen/verplaatsen/undo), Slim sorteren (analyse-stappen,
  geocoding, bulk-acties), login/registratie, paywall/limiet, prestaties
  (laadtijden, aantallen), en niveaus/retentie.
- Daarna implementeren volgens dat plan.

### Playwright stap 2 — screenshot-harness
Niet gestart. App-schermen (Triage/SmartSort) met nepfoto's renderen zónder
login → echte marketing-screenshots + basis voor UI-tests.

### e2e-tests (PRD §8.3 / §8.4)
Alleen een landing-rooktest bestaat. UI- en responsive-tests; leunt op de
screenshot-harness hierboven.

## 🤔 Beslissingen die nog open staan
- **Standaarddrempels "Vind vergelijkbare"**: huidige `vorm ≤12 / kleur ≥0.78`
  laten, of iets ruimer (~`16 / 0.73`) zodat randgevallen rond 18/0.73 standaard
  matchen? Ruimer = meer kans op valse matches.

## ❌ Bewust niet doen
- **Grid-modus per map (G1–G3)** — gedescoped 2026-06-19, zie PRD §4.4.
- **Camera-album-vastloper** — eenmalig gebleken, niet verder onderzoeken.

## ✅ Recent afgerond
- Logmodule + Logboek-tab in het beheervenster.
- Buildnummer (`0.<aantal commits>`) linksboven.
- "Vind vergelijkbare": fijner kleurhistogram, robuuste scan (timeout/try-catch),
  selectie in de resultaten-sheet, niets-gevonden-banner, schuifwaarden + beste
  vorm/kleur van de laatste scan.
- Playwright ingericht (landing-screenshot + rooktest).
