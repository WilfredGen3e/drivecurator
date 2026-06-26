// ─────────────────────────────────────────────────────────────────────────────
//  White-label branding — ÉÉN bron van waarheid
// ─────────────────────────────────────────────────────────────────────────────
//  Alle merk-afhankelijke waarden (naam, teksten, meta, kleuren, PWA-manifest)
//  worden HIER beheerd. De rest van de app leest uitsluitend uit dit object —
//  zoek nergens anders naar hardcoded "DriveCurator".
//
//  Naam wijzigen? Pas `name` (en eventueel `shortName`/kleuren) aan; de hele
//  app, de <title>, de meta-tags, het PWA-manifest en de thema-kleur volgen
//  automatisch.  Bijv.:  name: 'PhotoPilot'
//
//  Dit bestand wordt zowel door de app (runtime) als door `vite.config.ts`
//  (build-time: index.html-transform + PWA-manifest) geïmporteerd. Houd het
//  daarom vrij van React/DOM-afhankelijkheden.
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandingColors {
  /** Primaire merk-/accentkleur (knoppen, links, actieve states) — light mode. */
  accent: string
  accentHover: string
  accentLight: string
  /** Dezelfde accentfamilie voor dark mode. */
  accentDark: string
  accentDarkHover: string
  accentDarkLight: string
}

export interface Branding {
  /** Volledige productnaam — overal in de UI, titels en meta. */
  name: string
  /** Korte naam (PWA-startscherm, smalle plekken). */
  shortName: string
  /** Browser-<title>. Standaard gelijk aan `name`. */
  title: string
  /** Eénregelige omschrijving — meta description + PWA. */
  description: string
  /** Korte slogan / eyebrow boven de hero. */
  slogan: string
  /** Contact voor support/beheer (mailto). */
  supportEmail: string
  /** Productie-URL (gebruikt o.a. in de API-User-Agent). */
  productionUrl: string
  /** Taal (html lang + manifest lang). */
  lang: string
  /** Logo-pad in /public. */
  logo: string
  /** Apple-touch-icon-pad in /public. */
  appleTouchIcon: string
  /** Open Graph / social preview. */
  og: {
    title: string
    description: string
    /** Pad of URL naar de OG-afbeelding. */
    image: string
  }
  /** Thema-kleur (browser-UI + PWA). Standaard gelijk aan colors.accent. */
  themeColor: string
  /** Achtergrondkleur bij PWA-splash. */
  backgroundColor: string
  /** Merkkleuren — voeden de CSS-variabelen via applyBranding(). */
  colors: BrandingColors
  /** PWA-manifestinstellingen. */
  pwa: {
    display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
    startUrl: string
    scope: string
  }
}

// Kernvelden — pas hier de naam/omschrijving aan; titel, korte naam, OG-tags
// en PWA volgen automatisch (tenzij je ze hieronder expliciet overschrijft).
const name = 'DriveCurator'
const description = 'Snel en efficiënt je OneDrive-foto’s opschonen.'
// Primaire merkkleur (systemBlue). Voedt zowel de accent-CSS-variabele als de
// browser/PWA-themakleur, zodat de huisstijlkleur op één plek wisselt.
const accent = '#007aff'

export const branding: Branding = {
  name,
  shortName: name,
  title: name,
  description,
  slogan: 'OneDrive foto beheer',
  supportEmail: 'stefansiemerink@outlook.com',
  productionUrl: 'https://drivecurator.azurestaticapps.net',
  lang: 'nl',
  logo: '/icon-any.svg',
  appleTouchIcon: '/apple-touch-icon-180x180.png',
  og: {
    title: name,
    description,
    image: '/screenshots/triage-mobile.png',
  },
  themeColor: accent,
  backgroundColor: '#ffffff',
  colors: {
    accent,
    accentHover: '#0066d6',
    accentLight: '#e9f2ff',
    accentDark: '#0a84ff',
    accentDarkHover: '#409cff',
    accentDarkLight: '#1c3a5e',
  },
  pwa: {
    display: 'standalone',
    startUrl: '/',
    scope: '/',
  },
}

/** API-User-Agent, samengesteld uit de merknaam + productie-URL. */
export const userAgent = `${branding.name}/1.0 (${branding.productionUrl})`
