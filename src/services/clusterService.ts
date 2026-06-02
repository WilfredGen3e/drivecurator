import { DriveItem } from './graphService'

export type ClusterType = 'location' | 'screenshots' | 'whatsapp' | 'monthly' | 'other'

export interface PhotoCluster {
  id: string
  type: ClusterType
  photos: DriveItem[]
  label: string
  // Alleen bij location clusters:
  centroid?: { latitude: number; longitude: number }
  startDate?: Date
  endDate?: Date
}

const LOCATION_RADIUS_KM = 75  // km — twee locaties worden als "zelfde gebied" beschouwd
const TIME_GAP_DAYS = 7         // dagen — maximale onderbreking binnen één cluster
const MIN_CLUSTER_SIZE = 3      // minder foto's → gaat naar Overig

// Haversine-formule: afstand in km tussen twee GPS-coördinaten
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Schermafbeelding-detectie op basis van bestandsnaam en MIME-type
function isScreenshot(photo: DriveItem): boolean {
  const name = photo.name.toLowerCase()
  if (/screenshot|schermafbeelding|scherm_/.test(name)) return true
  // PNG zonder cameraMake is vrijwel altijd een screenshot of download
  if (photo.file?.mimeType === 'image/png' && !photo.photo?.cameraMake) return true
  return false
}

function getPhotoDate(photo: DriveItem): Date | null {
  const str = photo.photo?.takenDateTime ?? photo.fileSystemInfo?.createdDateTime
  return str ? new Date(str) : null
}

export function clusterPhotos(photos: DriveItem[]): PhotoCluster[] {
  // ── Stap 1: schermafbeeldingen eruit halen ────────────────────────────────
  const screenshots: DriveItem[] = []
  const rest: DriveItem[] = []
  for (const photo of photos) {
    if (isScreenshot(photo)) screenshots.push(photo)
    else rest.push(photo)
  }

  // ── Stap 2: split op aanwezigheid van GPS-data ────────────────────────────
  const withGps: DriveItem[] = []
  const noGps: DriveItem[] = []
  for (const photo of rest) {
    if (photo.location?.latitude !== undefined) withGps.push(photo)
    else noGps.push(photo)
  }

  // ── Stap 3: sorteer GPS-foto's op datum ───────────────────────────────────
  withGps.sort((a, b) => {
    return (getPhotoDate(a)?.getTime() ?? 0) - (getPhotoDate(b)?.getTime() ?? 0)
  })

  // ── Stap 4: greedy clustering op tijd + locatie ───────────────────────────
  // Een foto wordt aan een bestaande cluster toegevoegd als:
  //   - de tijdkloof tot het einde van die cluster ≤ TIME_GAP_DAYS
  //   - de afstand tot het zwaartepunt van die cluster ≤ LOCATION_RADIUS_KM
  interface InternalCluster {
    photos: DriveItem[]
    centroid: { latitude: number; longitude: number }
    startDate: Date
    endDate: Date
  }

  const TIME_GAP_MS = TIME_GAP_DAYS * 24 * 60 * 60 * 1000
  const internalClusters: InternalCluster[] = []

  for (const photo of withGps) {
    const date = getPhotoDate(photo)
    if (!date) { noGps.push(photo); continue }

    const { latitude, longitude } = photo.location!

    let assigned = false
    for (const cluster of internalClusters) {
      // Tijdsconditie: foto mag niet verder dan TIME_GAP_DAYS na het einde van de cluster liggen
      if (date.getTime() - cluster.endDate.getTime() > TIME_GAP_MS) continue

      // Ruimteconditie: foto moet dicht bij het zwaartepunt liggen
      const dist = haversineKm(latitude, longitude, cluster.centroid.latitude, cluster.centroid.longitude)
      if (dist > LOCATION_RADIUS_KM) continue

      // Toevoegen + zwaartepunt bijwerken (lopend gemiddelde)
      cluster.photos.push(photo)
      const n = cluster.photos.length
      cluster.centroid.latitude  = (cluster.centroid.latitude  * (n - 1) + latitude)  / n
      cluster.centroid.longitude = (cluster.centroid.longitude * (n - 1) + longitude) / n
      if (date > cluster.endDate)   cluster.endDate   = date
      if (date < cluster.startDate) cluster.startDate = date
      assigned = true
      break
    }

    if (!assigned) {
      internalClusters.push({
        photos: [photo],
        centroid: { latitude, longitude },
        startDate: date,
        endDate: date,
      })
    }
  }

  // ── Stap 5: bouw resultaat-clusters ──────────────────────────────────────
  const result: PhotoCluster[] = []
  const overflowPhotos: DriveItem[] = [...noGps]

  // Sorteer clusters op datum (nieuwste eerst)
  internalClusters.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

  for (let i = 0; i < internalClusters.length; i++) {
    const c = internalClusters[i]

    // Te kleine clusters gaan naar Overig
    if (c.photos.length < MIN_CLUSTER_SIZE) {
      overflowPhotos.push(...c.photos)
      continue
    }

    // Tijdslabel op basis van startdatum (Phase C vervangt dit met geo-naam)
    const monthYear = c.startDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })

    result.push({
      id: `loc-${i}`,
      type: 'location',
      photos: c.photos,
      centroid: c.centroid,
      startDate: c.startDate,
      endDate: c.endDate,
      label: `Foto's van ${monthYear}`,
    })
  }

  if (screenshots.length > 0) {
    result.push({
      id: 'screenshots',
      type: 'screenshots',
      photos: screenshots,
      label: 'Schermafbeeldingen',
    })
  }

  if (overflowPhotos.length > 0) {
    result.push({
      id: 'other',
      type: 'other',
      photos: overflowPhotos,
      label: "Overige foto's",
    })
  }

  return result
}

// Nominatim reverse geocoding: voegt geo-naam toe aan location clusters.
// Roept Nominatim maximaal 1x per seconde aan (usage policy).
// Bij een mislukte call blijft het datum-label staan.
export async function geocodeClusters(
  clusters: PhotoCluster[],
  onProgress?: (done: number, total: number) => void,
): Promise<PhotoCluster[]> {
  const result = [...clusters]
  const locationIndices = result
    .map((c, i) => (c.type === 'location' && c.centroid ? i : -1))
    .filter((i) => i >= 0)

  let lastCallAt = 0

  for (let n = 0; n < locationIndices.length; n++) {
    const i = locationIndices[n]
    const cluster = result[i]

    // Nominatim rate limit: wacht tot er minstens 1100ms verstreken is
    const wait = 1100 - (Date.now() - lastCallAt)
    if (lastCallAt > 0 && wait > 0) {
      await new Promise((r) => setTimeout(r, wait))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const { latitude, longitude } = cluster.centroid!
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${latitude}&lon=${longitude}&format=json&accept-language=nl`

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      lastCallAt = Date.now()

      if (res.ok) {
        const data = await res.json()
        const addr = data.address ?? {}
        const place =
          addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? null

        if (place) {
          const monthYear = cluster.startDate!.toLocaleDateString('nl-NL', {
            month: 'long',
            year: 'numeric',
          })
          result[i] = { ...cluster, label: `In de buurt van ${place}, ${monthYear}` }
        }
      }
    } catch {
      clearTimeout(timer)
      // Geocoding mislukt of timeout — datumgebaseerd label blijft staan
    }

    onProgress?.(n + 1, locationIndices.length)
  }

  return result
}
