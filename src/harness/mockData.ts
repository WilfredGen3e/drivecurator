import { AccountInfo, PublicClientApplication } from '@azure/msal-browser'
import { DriveItem } from '../services/graphService'
import { PhotoCluster } from '../services/clusterService'
import { AnalysisResult } from '../services/analysisService'

/**
 * Nep-data voor de screenshot-harness. Bewust GEEN echte Graph-/auth-calls:
 * elke foto heeft een ingebouwde lokale thumbnail-URL (`/mock/*.svg`), dus
 * TriageView/SmartSortView renderen zonder netwerk. Zie src/harness/Harness.tsx.
 *
 * Wil je echte marketing-foto's? Zet JPEG's in public/mock/ en wijs `thumb`
 * hieronder daarnaar — de rest werkt ongewijzigd.
 */

export const MOCK_FOLDER = { id: 'mock-folder', name: 'Camera-album' }

// Echte demo-foto's uit e2e/mock-photos/ (gehost op /mock/* door de dev-only
// Vite-middleware, zie vite.config.ts). Volgorde = volgorde in de triage; de
// eerste is de "hero" die in marketing-shots bovenaan staat.
const PHOTO_FILES = [
  '5354816576.jpg', '2766342728.jpg', '1749160601.jpg', '1895528633.jpg',
  '5259214232.jpg', '7354145487.jpg', '4167123167.jpg', '7359415993.jpg',
  '3008600982.jpg', '4809199690.jpg', '5307731726.jpg', '7068602260.jpg',
  '8709696711.jpg', '9595367662.jpg', '5887266590.jpg', '7081150358.jpg',
  '8413306737.jpg', '1781513208.jpg', '2491138603.jpg', '4149622802.jpg',
  '8845839645.jpg', '5905682185.jpg', '9476440588.jpg', '8594185784.jpg',
  '1081683410.jpg', 'photo-5.jpg',
]

const CAMERAS = [
  { cameraMake: 'Apple', cameraModel: 'iPhone 15 Pro' },
  { cameraMake: 'Apple', cameraModel: 'iPhone 13' },
  { cameraMake: 'samsung', cameraModel: 'Galaxy S23' },
]

// Verspreid de foto's over een paar dagen in oktober, zodat datum/tijd in de
// metadata realistisch oogt zonder dat we per foto iets hoeven te verzinnen.
export const MOCK_PHOTOS: DriveItem[] = PHOTO_FILES.map((file, i) => {
  const day = 11 + Math.floor(i / 4)
  const hour = 8 + ((i * 3) % 12)
  const iso = `2024-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00Z`
  const url = `/mock/${file}`
  return {
    id: `p${i + 1}`,
    name: `IMG_${4800 + i}.jpg`,
    size: 2_400_000 + ((i * 317_000) % 3_600_000),
    photo: { takenDateTime: iso, ...CAMERAS[i % CAMERAS.length] },
    fileSystemInfo: { createdDateTime: iso },
    thumbnails: [{ large: { url }, medium: { url } }],
  }
})

/**
 * Stub-account + stub-MSAL. Worden alleen als props doorgegeven; omdat de
 * mock-foto's al een thumbnail bevatten en we in de screenshots geen acties
 * uitvoeren, worden hun methodes nooit aangeroepen.
 */
export const MOCK_ACCOUNT = {
  homeAccountId: 'mock',
  environment: 'login.windows.net',
  tenantId: 'consumers',
  username: 'demo@outlook.com',
  localAccountId: 'mock',
  name: 'Demo Gebruiker',
} as AccountInfo

export const MOCK_MSAL = {
  // Levert een nep-token; de echte Graph-call wordt door de fetch-shim in
  // Harness.tsx onderschept (mappen voor de sidebar). Zo gaat er geen echt
  // netwerkverkeer uit en is er geen echte login nodig.
  acquireTokenSilent: () => Promise.resolve({ accessToken: 'mock-token' }),
  getAllAccounts: () => [MOCK_ACCOUNT],
} as unknown as PublicClientApplication

// Nep-mappen voor FolderSidebar (zowel triage-desktop als de verplaats-sheet).
// Worden geserveerd door de fetch-shim in Harness.tsx op elke /me/drive/*children.
export const MOCK_FOLDERS: DriveItem[] = [
  { id: 'f1', name: 'Vakanties 2024', folder: {} },
  { id: 'f2', name: 'Bewaren', folder: {} },
  { id: 'f3', name: 'Familie', folder: {} },
  { id: 'f4', name: 'Te sorteren', folder: {} },
  { id: 'f5', name: 'Schermafbeeldingen', folder: {} },
]

// ── Nep-analyseresultaat voor het "Slim sorteren"-dashboard ───────────────────
// Verdeelt de demo-foto's over de categorieën zodat elke kaart een teller > 0
// heeft. Overlap tussen categorieën is prima — het is puur weergave-data.
const p = (from: number, to: number) => MOCK_PHOTOS.slice(from, to)
const dateOf = (item: DriveItem) => new Date(item.photo!.takenDateTime!)

export const MOCK_CLUSTER: PhotoCluster = {
  id: 'loc-bos',
  type: 'location',
  label: 'Herfst in het bos',
  photos: p(0, 8),
  centroid: { latitude: 52.1, longitude: 5.9 },
  startDate: dateOf(MOCK_PHOTOS[0]),
  endDate: dateOf(MOCK_PHOTOS[7]),
}

export const MOCK_ANALYSIS: AnalysisResult = {
  totalPhotos: MOCK_PHOTOS.length,
  locationClusters: [
    MOCK_CLUSTER,
    {
      id: 'loc-stad', type: 'location', label: 'Stadswandeling',
      photos: p(8, 13), centroid: { latitude: 52.4, longitude: 4.9 },
      startDate: dateOf(MOCK_PHOTOS[8]), endDate: dateOf(MOCK_PHOTOS[12]),
    },
  ],
  screenshots: p(13, 15),
  whatsapp: p(15, 17),
  monthlyGroups: [
    { id: 'm-2024-10', year: 2024, month: 10, label: 'oktober 2024', photos: p(16, 20) },
  ],
  burstSets: [
    { id: 'burst-1', photos: p(20, 23), startDate: dateOf(MOCK_PHOTOS[20]) },
  ],
  duplicateSets: [
    { id: 'dup-1', photos: p(23, 25) },
  ],
  otherCameraGroups: [
    { id: 'oc-samsung', cameraMake: 'samsung', photos: p(2, 5) },
  ],
  potentialJunk: p(9, 11),
}
