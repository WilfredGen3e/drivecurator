import { useRef, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getItemThumbnails } from '../services/graphService'
import {
  fetchThumbnailAsBlob,
  calculateFingerprint,
  hammingDistance,
  histogramSimilarity,
  THRESHOLD_HASH_DEFAULT,
  THRESHOLD_COLOR_DEFAULT,
  type PhotoFingerprint,
} from '../services/perceptualHashService'
import { logInfo, logError } from '../services/logService'

// Aantal gelijktijdige thumbnail-fetches tijdens een scan.
const SCAN_CONCURRENCY = 8

export interface FindSimilarOptions {
  msalInstance: PublicClientApplication
  account: AccountInfo
  /** De foto's om te doorzoeken (bv. de gefilterde lijst of een cluster). */
  photos: DriveItem[]
  /** De referentiefoto waarmee vergeleken wordt. */
  current: DriveItem | undefined
  /** Optionele display-cache met verse thumbnail-URL's (na sessie-herstel). */
  thumbCache?: Record<string, string>
  /** Verwijdert de verwerkte foto's uit de host-lijst en stelt de positie bij. */
  onProcessed: (processedIds: string[]) => void
}

/**
 * Herbruikbare "Vind vergelijkbare"-logica voor elke triage/sorteer-modus.
 * Beheert de perceptuele scan, de gevoeligheidsdrempels, de resultaten-sheet,
 * het "niets gevonden"-bannertje en de laatste scanwaarden.
 */
export function useFindSimilar(opts: FindSimilarOptions) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [similarPhotos, setSimilarPhotos] = useState<DriveItem[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [thresholdHash, setThresholdHash] = useState(THRESHOLD_HASH_DEFAULT)
  const [thresholdColor, setThresholdColor] = useState(THRESHOLD_COLOR_DEFAULT)
  // Klein "niets gevonden"-bannertje met de dichtstbijzijnde waarden.
  const [noMatch, setNoMatch] = useState<{ scanned: number; bestHam: number; bestHist: number } | null>(null)
  // Beste vorm/kleur van de laatste scan — getoond bij de schuifjes als houvast.
  const [lastScan, setLastScan] = useState<{ bestHam: number; bestHist: number } | null>(null)
  const abortRef = useRef(false)
  // Hergebruik berekende fingerprints binnen de sessie.
  const fingerprintCache = useRef<Map<string, PhotoFingerprint>>(new Map())

  // Live ref zodat findSimilar (zonder argumenten) altijd de actuele pool/foto leest.
  const optsRef = useRef(opts)
  optsRef.current = opts

  const findSimilar = async () => {
    const { msalInstance, account, photos, current, thumbCache } = optsRef.current
    if (!current || isScanning) return

    abortRef.current = false
    setNoMatch(null)
    setIsScanning(true)
    setScanProgress(0)

    // Haal een fingerprint uit de cache, of bereken hem één keer. De opgeslagen
    // thumbnail-URL kan ontbreken na een herstelde sessie — dan vers ophalen.
    const getFingerprint = async (item: DriveItem): Promise<PhotoFingerprint | null> => {
      const cached = fingerprintCache.current.get(item.id)
      if (cached) return cached
      let url: string | undefined = item.thumbnails?.[0]?.medium?.url ?? thumbCache?.[item.id]
      if (!url) {
        const t = await getItemThumbnails(msalInstance, account, item.id)
        url = t?.medium?.url ?? t?.large?.url
      }
      if (!url) return null
      const blob = await fetchThumbnailAsBlob(url)
      const fp = blob ? await calculateFingerprint(blob, item.id) : null
      if (fp) fingerprintCache.current.set(item.id, fp)
      return fp
    }

    try {
      const refFp = await getFingerprint(current)
      if (!refFp) {
        logError('Vind vergelijkbare: referentiefoto kon niet geanalyseerd worden', { naam: current.name })
        return
      }

      const others = photos.filter(p => p.id !== current.id)
      const queue = [...others]
      const matches: DriveItem[] = []
      let processed = 0
      let usable = 0
      let bestHam = 64
      let bestHist = 0

      const worker = async () => {
        while (true) {
          if (abortRef.current) break
          const p = queue.shift()
          if (!p) break
          const fp = await getFingerprint(p)
          if (fp) {
            usable++
            const ham = hammingDistance(refFp.dHash, fp.dHash)
            const hist = histogramSimilarity(refFp.colorHistogram, fp.colorHistogram)
            if (ham < bestHam) bestHam = ham
            if (hist > bestHist) bestHist = hist
            if (ham <= thresholdHash || hist >= thresholdColor) matches.push(p)
          }
          processed++
          setScanProgress(others.length ? Math.round((processed / others.length) * 100) : 100)
        }
      }
      await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker))

      if (abortRef.current) return

      setLastScan({ bestHam, bestHist })
      logInfo(
        `Vind vergelijkbare: ${matches.length} match(es) in ${others.length} foto's`,
        { bruikbaar: usable, besteVorm: bestHam, besteKleur: +bestHist.toFixed(3), drempelVorm: thresholdHash, drempelKleur: thresholdColor },
      )

      if (matches.length === 0) {
        setNoMatch({ scanned: others.length, bestHam, bestHist })
      } else {
        setSimilarPhotos([current, ...matches])
        setShowSheet(true)
      }
    } catch (e) {
      logError('Vind vergelijkbare: scan mislukt', e)
    } finally {
      setIsScanning(false)
    }
  }

  const cancelScan = () => {
    abortRef.current = true
    setIsScanning(false)
  }

  const clearNoMatch = () => setNoMatch(null)
  const closeSheet = () => { setShowSheet(false); setSimilarPhotos([]) }

  const handleDone = (processedIds: string[]) => {
    optsRef.current.onProcessed(processedIds)
    setShowSheet(false)
    setSimilarPhotos([])
  }

  return {
    findSimilar,
    cancelScan,
    isScanning,
    scanProgress,
    thresholdHash, setThresholdHash,
    thresholdColor, setThresholdColor,
    lastScan,
    noMatch, clearNoMatch,
    showSheet, similarPhotos, closeSheet, handleDone,
  }
}
