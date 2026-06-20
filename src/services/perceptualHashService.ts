// Perceptuele vingerafdruk van een foto-thumbnail.
// Combineert vorm/compositie (dHash) met dominante kleur (kleurhistogram),
// zodat visueel vergelijkbare foto's op beide assen herkend kunnen worden.

export const THRESHOLD_HASH_DEFAULT = 12
export const THRESHOLD_COLOR_DEFAULT = 0.78

export type PhotoFingerprint = {
  itemId: string
  dHash: number[]
  colorHistogram: number[]
}

/**
 * Haalt een thumbnail op als Blob.
 * Bij 429: één keer opnieuw na 2 seconden. Bij elke andere fout: null.
 */
export async function fetchThumbnailAsBlob(url: string, timeoutMs = 8000): Promise<Blob | null> {
  // Thumbnail-URL's van Graph zijn al pre-authenticated (ze worden elders ook
  // direct in <img src> gebruikt). Een extra Authorization-header triggert een
  // CORS-preflight die de CDN kan weigeren of vertragen — dus die sturen we
  // bewust niet mee. Een timeout zorgt dat één trage/dode URL nooit een hele
  // scan kan laten hangen.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const doFetch = () => fetch(url, { signal: controller.signal })
  try {
    let response = await doFetch()
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2000))
      response = await doFetch()
    }
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = objectUrl
  })
}

// dHash op 9×8 (→ 8×8 = 64 bits). Het kleurhistogram berekenen we bewust op een
// grover raster van véél meer pixels: uit slechts 72 pixels is een histogram te
// schaars, waardoor bijna-identieke foto's onterecht laag scoren.
const HIST_SIZE = 32 // 32×32 = 1024 pixels voor het kleurhistogram

function drawToData(img: HTMLImageElement, w: number, h: number): Uint8ClampedArray | null {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h).data
}

/**
 * Berekent dHash (vorm, 9×8) en kleurhistogram (32×32 pixels, 512 emmers).
 * Roept altijd revokeObjectURL aan. Bij fout: null.
 */
export async function calculateFingerprint(blob: Blob, itemId: string): Promise<PhotoFingerprint | null> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await loadImage(objectUrl)

    // ── dHash (vorm) ─ uit 9×8 grijswaarden ────────────────────────────────
    const dData = drawToData(img, 9, 8)
    if (!dData) return null
    const gray = new Array<number>(9 * 8)
    for (let i = 0; i < 9 * 8; i++) {
      gray[i] = 0.299 * dData[i * 4] + 0.587 * dData[i * 4 + 1] + 0.114 * dData[i * 4 + 2]
    }
    // Vergelijk elke pixel met zijn rechterbuur: 1 als lichter, anders 0.
    const dHash: number[] = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const idx = row * 9 + col
        dHash.push(gray[idx] > gray[idx + 1] ? 1 : 0)
      }
    }

    // ── Kleurhistogram ─ uit 32×32 pixels, 8×8×8 = 512 emmers ──────────────
    const cData = drawToData(img, HIST_SIZE, HIST_SIZE)
    if (!cData) return null
    const histPixels = HIST_SIZE * HIST_SIZE
    const colorHistogram = new Array<number>(512).fill(0)
    for (let i = 0; i < histPixels; i++) {
      const r = Math.floor(cData[i * 4] / 32)
      const g = Math.floor(cData[i * 4 + 1] / 32)
      const b = Math.floor(cData[i * 4 + 2] / 32)
      colorHistogram[r * 64 + g * 8 + b]++
    }
    for (let i = 0; i < 512; i++) colorHistogram[i] /= histPixels

    return { itemId, dHash, colorHistogram }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Aantal posities waarop a en b verschillen (0–64). */
export function hammingDistance(a: number[], b: number[]): number {
  let distance = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) distance++
  }
  return distance
}

/**
 * Histogram-intersectie: som van het minimum per emmer.
 * 0 = totaal verschillende kleuren, 1 = identieke kleurverdeling.
 */
export function histogramSimilarity(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.min(a[i], b[i])
  }
  return sum
}

/**
 * Vergelijkbaar als de vorm óf de kleur dichtbij genoeg is.
 */
export function isSimilar(
  a: PhotoFingerprint,
  b: PhotoFingerprint,
  thresholdHash: number,
  thresholdColor: number,
): boolean {
  return (
    hammingDistance(a.dHash, b.dHash) <= thresholdHash ||
    histogramSimilarity(a.colorHistogram, b.colorHistogram) >= thresholdColor
  )
}
