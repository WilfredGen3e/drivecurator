# DriveCurator — Productoverzicht

*Snel en plezierig je OneDrive-foto's opruimen.*

---

## Wat is DriveCurator?

DriveCurator is een webapplicatie (tevens als app te installeren) waarmee gebruikers in
hoog tempo hun OneDrive-foto's en -video's opschonen via een swipe-interface — zonder het
trage aanvink-gedoe van OneDrive zelf.

Het lost een concreet en breed gevoeld probleem op: OneDrive dwingt je om foto's één voor
één aan te vinken met kleine selectievakjes. Bij grote collecties — vakanties, camera-
back-ups, duizenden foto's — wordt opruimen daardoor onbegonnen werk. DriveCurator maakt
er een snelle, intuïtieve doorklik-flow van.

De potentiële markt is groot: de app werkt voor elk persoonlijk OneDrive-account, een
gebruikersgroep van honderden miljoenen wereldwijd.

---

## Toegang & veiligheid

- **Inloggen met een eigen Microsoft-account** (Outlook, Hotmail, Live) via de officiële,
  veilige Microsoft-loginflow.
- **De data blijft eigendom van de gebruiker.** De app communiceert rechtstreeks vanuit de
  browser met OneDrive. Er is geen tussenserver die foto's opslaat of kopieert.
- **Verwijderen is veilig en omkeerbaar:** alles gaat naar de OneDrive-prullenbak, nooit
  direct permanent weg.
- **Sessies blijven behouden**, zodat gebruikers niet telkens opnieuw hoeven in te loggen.

---

## Drie manieren om op te ruimen

### 1. Handmatig organiseren (swipe-triage)
- Foto's één voor één, groot in beeld.
- Per foto drie acties: **Verwijderen**, **Verplaatsen naar map**, of **Bewaren**.
- Te bedienen via **swipe-gebaren**, via **knoppen**, of via **toetsenbord-shortcuts** op
  desktop.
- **Ongedaan maken** van de laatste actie.
- Toont relevante **metadata**: datum, camera, bestandsgrootte en bestandsnaam.
- **Voortgangsindicator** ("foto 34 van 210").
- **"Vind vergelijkbare foto's"** — herken snel bijna-identieke kiekjes en kies de beste.

### 2. Slim sorteren (automatische analyse)
De app analyseert een volledige map en groepeert de foto's automatisch in **zes
categorieën**, die per groep in één keer kunnen worden afgehandeld:

- **Locatie / vakantie** — geclusterd op GPS en datum, met automatisch herkende plaatsnaam
  (bijv. "Barcelona, juni 2024").
- **Screenshots**
- **WhatsApp / social media** (WhatsApp, Instagram, Snapchat, TikTok)
- **Maandelijkse groepen** (gewone camerafoto's per maand)
- **Burst-reeksen** (snelle series van hetzelfde moment)
- **Duplicaten**

Per groep kan de gebruiker de **hele groep in één keer verplaatsen**, de groep **doorlopen
in triage**, of **overslaan**.

### 3. Video's opruimen
- Aparte modus met een volwaardige **videospeler** om snel te beoordelen.
- Dezelfde verwijder-, verplaats- en ongedaan-maken-acties als bij foto's.

---

## Mappenbeheer

- **Navigeren** door de volledige OneDrive-mappenstructuur met breadcrumbs.
- **Nieuwe mappen aanmaken** rechtstreeks vanuit de app tijdens het sorteren.
- **Bulk verplaatsen** met meerdere parallelle taken tegelijk — snel, ook bij grote groepen.

---

## Platform & uitstraling

- **Werkt op desktop én mobiel** (iPhone, iPad, Mac, Windows). De mobiele weergave is
  compacter en geoptimaliseerd voor touch.
- **Installeerbaar als app** (PWA) — op het beginscherm of bureaublad, in full-screen.
- **Verzorgde, Apple-geïnspireerde vormgeving** met ondersteuning voor dark mode. De foto's
  staan centraal; de interface eromheen is rustig en strak.
- **Geschikt voor grote collecties** (tienduizenden foto's): de eerste 200 verschijnen
  direct, de rest laadt op de achtergrond door.

---

## Ingebouwd verdienmodel — klaar voor commercieel gebruik

De basis voor een commerciële SaaS staat al in het product:

- **Gebruikersbeheer** met een lichte serverless backend.
- **Freemium-model ingebouwd:** gratis gebruikers kunnen tot 200 foto's verwerken, daarna
  verschijnt een **upgrade-/paywall-scherm**. Betaalde (premium) gebruikers zijn onbeperkt.
- **Gebruiksmeting** per gebruiker.
- **Beheerdersportaal** met inzicht in gebruikers en een logboek.
- **Rollenstructuur**: beheerder / premium / gratis.

> Stripe-betalingen zijn nog niet aangesloten, maar de paywall, de gebruikslimieten, de
> gebruikersregistratie en de gebruiksmeting zijn al aanwezig. Het commerciële geraamte
> staat dus — alleen de betaalprovider hoeft nog te worden gekoppeld.

---

## Techniek in het kort

- React 18 + TypeScript, Vite-build, Tailwind-styling.
- Microsoft Graph API voor alle OneDrive-acties; MSAL voor authenticatie.
- Gehost op Azure Static Web Apps met **automatische deployment** bij elke wijziging
  (CI/CD via GitHub Actions).
- Lichte serverless backend (Azure Functions + Table Storage).
- **Lage exploitatiekosten:** draait grotendeels op gratis Azure-tiers; geen zware
  serverinfrastructuur te beheren.

---

## Roadmap — voorzien, nog niet gebouwd

- **Stripe-betalingen** aansluiten op de bestaande paywall.
- **Google Photos**-integratie naast OneDrive.
- **AI-suggesties** ("deze 23 foto's lijken op duplicaten").
- **Bulk-export / ZIP-download**.
- **White-label-versie** voor fotografen.

---

*Voor een technische rondleiding of inzage in de code onder de motorkap is een
demo-omgeving en repository-toegang beschikbaar op aanvraag.*
