import { DriveItem } from './graphService'
import { PhotoCluster, clusterPhotos, geocodeClusters, isScreenshot, getPhotoDate } from './clusterService'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MonthGroup {
  id: string
  year: number
  month: number   // 1-12
  label: string   // "augustus 2024"
  photos: DriveItem[]
}

export interface BurstSet {
  id: string
  photos: DriveItem[]
  startDate?: Date
}

export interface DuplicateSet {
  id: string
  photos: DriveItem[]
}

export interface OtherCameraGroup {
  id: string
  cameraMake: string
  photos: DriveItem[]
}

export interface AnalysisResult {
  totalPhotos: number
  locationClusters: PhotoCluster[]  // geocoded
  screenshots: DriveItem[]
  whatsapp: DriveItem[]
  monthlyGroups: MonthGroup[]
  burstSets: BurstSet[]
  duplicateSets: DuplicateSet[]
  otherCameraGroups: OtherCameraGroup[]
  potentialJunk: DriveItem[]
}

// ── Detectie-helpers ─────────────────────────────────────────────────────────

function isWhatsApp(photo: DriveItem): boolean {
  const name = photo.name.toLowerCase()
  return /^img-\d{8}-wa\d+|^wa\d{4,}|\bwhatsapp\b|\binstagram\b|\bvsco\b|\bsnapchat\b|\btiktok\b/.test(name)
}

// ── Maandelijkse groepen ──────────────────────────────────────────────────────

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function buildMonthlyGroups(photos: DriveItem[]): MonthGroup[] {
  const map = new Map<string, DriveItem[]>()
  for (const photo of photos) {
    const d = getPhotoDate(photo)
    if (!d) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(photo)
  }

  const groups: MonthGroup[] = []
  for (const [key, groupPhotos] of map) {
    const [year, monthIndex] = key.split('-').map(Number)
    groups.push({
      id: `month-${key}`,
      year,
      month: monthIndex + 1,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      photos: groupPhotos.sort((a, b) => (getPhotoDate(a)?.getTime() ?? 0) - (getPhotoDate(b)?.getTime() ?? 0)),
    })
  }

  return groups.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
}

// ── Burst-detectie ────────────────────────────────────────────────────────────

const BURST_GAP_MS = 3000  // 3 seconden

function detectBursts(photos: DriveItem[]): BurstSet[] {
  const withCamera = photos
    .filter(p => p.photo?.cameraMake && getPhotoDate(p))
    .sort((a, b) => (getPhotoDate(a)?.getTime() ?? 0) - (getPhotoDate(b)?.getTime() ?? 0))

  const sets: BurstSet[] = []
  let current: DriveItem[] = []

  for (const photo of withCamera) {
    const date = getPhotoDate(photo)!
    if (current.length === 0) {
      current = [photo]
    } else {
      const lastDate = getPhotoDate(current[current.length - 1])!
      const sameCamera = photo.photo?.cameraMake === current[0].photo?.cameraMake
      if (sameCamera && date.getTime() - lastDate.getTime() <= BURST_GAP_MS) {
        current.push(photo)
      } else {
        if (current.length >= 3) {
          sets.push({ id: `burst-${sets.length}`, photos: [...current], startDate: getPhotoDate(current[0]) ?? undefined })
        }
        current = [photo]
      }
    }
  }
  if (current.length >= 3) {
    sets.push({ id: `burst-${sets.length}`, photos: current, startDate: getPhotoDate(current[0]) ?? undefined })
  }

  return sets
}

// ── Andere camera's-detectie ──────────────────────────────────────────────────

function isAppleDevice(photo: DriveItem): boolean {
  const make  = (photo.photo?.cameraMake  ?? '').toLowerCase()
  const model = (photo.photo?.cameraModel ?? '').toLowerCase()
  return make.includes('apple') || model.includes('apple') || model.includes('iphone')
}

function detectOtherCameras(photos: DriveItem[], excludeIds: Set<string>): OtherCameraGroup[] {
  const byMake = new Map<string, DriveItem[]>()
  for (const photo of photos) {
    if (excludeIds.has(photo.id)) continue
    const make = photo.photo?.cameraMake
    if (!make || isAppleDevice(photo)) continue
    if (!byMake.has(make)) byMake.set(make, [])
    byMake.get(make)!.push(photo)
  }

  const groups: OtherCameraGroup[] = []
  let i = 0
  for (const [make, groupPhotos] of byMake) {
    groups.push({ id: `other-camera-${i++}`, cameraMake: make, photos: groupPhotos })
  }
  return groups.sort((a, b) => b.photos.length - a.photos.length)
}

// ── Mogelijk rommel-detectie ──────────────────────────────────────────────────

const JUNK_MAX_SIZE = 800_000  // 800 KB

function detectPotentialJunk(photos: DriveItem[], excludeIds: Set<string>): DriveItem[] {
  return photos
    .filter(p => {
      if (excludeIds.has(p.id)) return false
      if (!p.photo) return false                    // geen foto-facet = geen camera-foto
      if (p.location) return false                  // heeft GPS = bewuste foto
      if ((p.size ?? Infinity) >= JUNK_MAX_SIZE) return false
      return true
    })
    .sort((a, b) => (getPhotoDate(a)?.getTime() ?? 0) - (getPhotoDate(b)?.getTime() ?? 0))
}

// ── Duplicaten-detectie ───────────────────────────────────────────────────────

function detectDuplicates(photos: DriveItem[]): DuplicateSet[] {
  // Groepeer op takenDateTime (afgekapt op seconde)
  const bySecond = new Map<string, DriveItem[]>()
  for (const photo of photos) {
    const dt = photo.photo?.takenDateTime
    if (!dt) continue
    const key = dt.substring(0, 19)
    if (!bySecond.has(key)) bySecond.set(key, [])
    bySecond.get(key)!.push(photo)
  }

  const sets: DuplicateSet[] = []
  let i = 0
  for (const [, group] of bySecond) {
    if (group.length >= 2) sets.push({ id: `dup-${i++}`, photos: group })
  }
  return sets
}

// ── Hoofdfunctie ──────────────────────────────────────────────────────────────

export async function analyzePhotos(
  photos: DriveItem[],
  onGeoProgress?: (done: number, total: number) => void,
): Promise<AnalysisResult> {
  // 1. Screenshots en WhatsApp/social eruit halen
  const screenshots = photos.filter(p => isScreenshot(p))
  const screenshotIds = new Set(screenshots.map(p => p.id))

  const whatsapp = photos.filter(p => !screenshotIds.has(p.id) && isWhatsApp(p))
  const whatsappIds = new Set(whatsapp.map(p => p.id))

  const forClustering = photos.filter(p => !screenshotIds.has(p.id) && !whatsappIds.has(p.id))

  // 2. GPS-clustering (hergebruikt clusterService)
  const rawClusters = clusterPhotos(forClustering)
  const locationClusters = rawClusters.filter(c => c.type === 'location')
  const otherPhotos = rawClusters.find(c => c.type === 'other')?.photos ?? []

  // 3. Geocoding (async — max 1 req/sec via Nominatim)
  const geocodedClusters = await geocodeClusters(locationClusters, onGeoProgress)

  // 4. Maandelijkse groepen: camera-foto's zonder GPS
  const cameraWithoutGps = otherPhotos.filter(p => p.photo?.cameraMake)
  const monthlyGroups = buildMonthlyGroups(cameraWithoutGps)

  // 5. Burst-reeksen
  const burstSets = detectBursts(forClustering)

  // 6. Duplicaten
  const duplicateSets = detectDuplicates(photos)

  // 7. Andere camera's (niet-Apple, exclusief screenshots en WhatsApp)
  const excludeFromOtherCamera = new Set([...screenshotIds, ...whatsappIds])
  const otherCameraGroups = detectOtherCameras(photos, excludeFromOtherCamera)

  // 8. Mogelijk rommel (klein + geen GPS, exclusief screenshots en WhatsApp)
  const potentialJunk = detectPotentialJunk(photos, excludeFromOtherCamera)

  return {
    totalPhotos: photos.length,
    locationClusters: geocodedClusters,
    screenshots,
    whatsapp,
    monthlyGroups,
    burstSets,
    duplicateSets,
    otherCameraGroups,
    potentialJunk,
  }
}
