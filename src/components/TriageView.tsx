import { useRef, useState, useMemo, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem, getItemThumbnails } from '../services/graphService'
import { getPhotoDate } from '../services/clusterService'
import { incrementUsage, FreeLimitReachedError } from '../services/apiService'
import PaywallModal from './PaywallModal'
import { useAppStore } from '../store/useAppStore'
import FolderSidebar, { Crumb } from './FolderSidebar'
import UndoToast from './UndoToast'
import SimilarPhotosSheet from './SimilarPhotosSheet'
import { useIsTouch } from '../hooks/useIsTouch'
import {
  fetchThumbnailAsBlob,
  calculateFingerprint,
  isSimilar,
  THRESHOLD_HASH_DEFAULT,
  THRESHOLD_COLOR_DEFAULT,
  type PhotoFingerprint,
} from '../services/perceptualHashService'

// Aantal gelijktijdige thumbnail-fetches tijdens een scan. Hoger = sneller,
// maar te hoog lokt OneDrive-throttling (429) uit. 8 is een veilige balans.
const SCAN_CONCURRENCY = 8

const MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
const SWIPE_HINT = 30
const SWIPE_COMMIT = 160

const PRESETS_KEY = 'drivecurator_presets'
const MAX_PRESETS = 5

interface FolderPreset { id: string; name: string }

function loadPresets(): FolderPreset[] {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]') }
  catch { return [] }
}

function addToPresets(folder: FolderPreset) {
  const current = loadPresets()
  if (current.some(p => p.id === folder.id)) return
  localStorage.setItem(PRESETS_KEY, JSON.stringify([folder, ...current].slice(0, MAX_PRESETS)))
}

function PhotoMeta({ photo }: { photo: DriveItem }) {
  const date = photo.photo?.takenDateTime ?? photo.fileSystemInfo?.createdDateTime
  const camera = [photo.photo?.cameraMake, photo.photo?.cameraModel].filter(Boolean).join(' ')
  const size = photo.size ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : null
  const formattedDate = date
    ? new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
    : null
  if (!formattedDate && !camera && !size) return null
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-fluent-text-secondary flex-wrap">
      {formattedDate && <span>{formattedDate}</span>}
      {camera && <span>· {camera}</span>}
      {size && <span>· {size}</span>}
    </div>
  )
}

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onBack: () => void
}

export default function TriageView({ msalInstance, account, onBack }: Props) {
  const { photos, currentFolderName, currentFolderId, pushUndo, popUndo, undoStack, fullyLoaded, currentUser, setCurrentUser, removePhotoById } = useAppStore()
  const isTouch = useIsTouch()

  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [presets, setPresets] = useState<FolderPreset[]>(() => loadPresets())
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({})
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter state
  const [fromYear, setFromYear] = useState<number | null>(null)
  const [fromMonth, setFromMonth] = useState<number | null>(null)
  const [toYear, setToYear] = useState<number | null>(null)
  const [toMonth, setToMonth] = useState<number | null>(null)
  const [filteredIndex, setFilteredIndex] = useState(0)

  // Touch-specifieke state
  const [showFolderSheet, setShowFolderSheet] = useState(false)
  const [lastFolder, setLastFolder] = useState<DriveItem | null>(null)
  const [lastFolderBreadcrumb, setLastFolderBreadcrumb] = useState<Crumb[]>([])
  const [showTouchFilter, setShowTouchFilter] = useState(false)

  // Swipe gesture state
  const [swipeDelta, setSwipeDelta] = useState({ x: 0, y: 0 })
  const [isActivelySwiping, setIsActivelySwiping] = useState(false)
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null)

  // "Vind vergelijkbare" state
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [similarPhotos, setSimilarPhotos] = useState<DriveItem[]>([])
  const [showSimilarSheet, setShowSimilarSheet] = useState(false)
  const [thresholdHash, setThresholdHash] = useState(THRESHOLD_HASH_DEFAULT)
  const [thresholdColor, setThresholdColor] = useState(THRESHOLD_COLOR_DEFAULT)
  // Aantal foto's dat de laatste scan doorzocht — gebruikt voor de lege-staat
  // ("X foto's doorzocht, niets gevonden") in de resultaten-sheet.
  const [scannedCount, setScannedCount] = useState(0)
  const abortRef = useRef(false)
  // Hergebruik berekende fingerprints binnen de sessie: elke thumbnail wordt
  // maar één keer opgehaald + berekend, ook over meerdere zoekacties heen.
  const fingerprintCache = useRef<Map<string, PhotoFingerprint>>(new Map())

  // Stable ref zodat de keydown listener maar één keer geregistreerd hoeft te worden
  // maar altijd de meest recente versie van de handlers aanroept.
  const keyHandlers = useRef({ handleDelete: () => {}, handleKeep: () => {}, handleUndo: () => {} })

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    photos.forEach(p => { const d = getPhotoDate(p); if (d) years.add(d.getFullYear()) })
    return Array.from(years).sort((a, b) => b - a)
  }, [photos])

  const filteredPhotos = useMemo(() => {
    const fromDate = fromYear ? new Date(fromYear, (fromMonth ?? 1) - 1, 1) : null
    const toDate = toYear
      ? toMonth ? new Date(toYear, toMonth, 0, 23, 59, 59) : new Date(toYear, 11, 31, 23, 59, 59)
      : null
    return photos
      .filter(p => {
        const d = getPhotoDate(p)
        if (!d) return !fromDate
        if (fromDate && d < fromDate) return false
        if (toDate && d > toDate) return false
        return true
      })
      .sort((a, b) => (getPhotoDate(a)?.getTime() ?? 0) - (getPhotoDate(b)?.getTime() ?? 0))
  }, [photos, fromYear, fromMonth, toYear, toMonth])

  useEffect(() => { setFilteredIndex(0) }, [fromYear, fromMonth, toYear, toMonth])

  const filterActive = fromYear !== null || toYear !== null
  const clearFilter = () => { setFromYear(null); setFromMonth(null); setToYear(null); setToMonth(null) }

  const photo = filteredPhotos[filteredIndex]
  const total = filteredPhotos.length
  const done = filteredIndex >= total

  const checkUsage = async (): Promise<boolean> => {
    if (currentUser?.isPremium || currentUser?.isAdmin) return true
    try {
      const updated = await incrementUsage(msalInstance, account)
      setCurrentUser(updated)
      return true
    } catch (e) {
      if (e instanceof FreeLimitReachedError) {
        setCurrentUser(e.userProfile)
        setShowPaywall(true)
        return false
      }
      return true
    }
  }

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const handleDelete = async () => {
    if (!photo || busy) return
    setBusy(true)
    try {
      if (!await checkUsage()) return
      await deleteItem(msalInstance, account, photo.id)
      pushUndo({ type: 'delete', item: photo, previousFolderId: currentFolderId! })
      removePhotoById(photo.id)
      showToast(`"${photo.name}" verwijderd`)
    } finally { setBusy(false) }
  }

  const handleKeep = async () => {
    if (!photo || busy) return
    setBusy(true)
    try {
      if (!await checkUsage()) return
      setFilteredIndex(i => i + 1)
    } finally { setBusy(false) }
  }

  const handleMove = async (targetFolder: DriveItem, breadcrumb?: Crumb[]) => {
    if (!photo || busy) return
    setBusy(true)
    setShowFolderSheet(false)
    try {
      if (!await checkUsage()) return
      await moveItem(msalInstance, account, photo.id, targetFolder.id)
      pushUndo({ type: 'move', item: photo, previousFolderId: currentFolderId! })
      removePhotoById(photo.id)
      setLastFolder(targetFolder)
      if (breadcrumb !== undefined) setLastFolderBreadcrumb(breadcrumb)
      addToPresets({ id: targetFolder.id, name: targetFolder.name })
      setPresets(loadPresets())
      showToast(`Verplaatst naar "${targetFolder.name}"`)
    } finally { setBusy(false) }
  }

  const handleMoveToLastFolder = async () => {
    if (lastFolder) await handleMove(lastFolder)
  }

  const handleUndo = async () => {
    const action = popUndo()
    if (!action) return
    setToast(null)
    setBusy(true)
    try {
      if (action.type === 'move') {
        await moveItem(msalInstance, account, action.item.id, action.previousFolderId)
        showToast('Verplaatsing ongedaan gemaakt')
      } else {
        showToast("Verwijderde foto's staan in de OneDrive prullenbak")
      }
    } finally { setBusy(false) }
  }

  const handleFindSimilar = async () => {
    if (!photo || isScanning) return
    const refUrl = photo.thumbnails?.[0]?.medium?.url
    if (!refUrl) return

    abortRef.current = false
    setIsScanning(true)
    setScanProgress(0)

    // Haal een fingerprint uit de cache of bereken hem één keer.
    const getFingerprint = async (item: DriveItem): Promise<PhotoFingerprint | null> => {
      const cached = fingerprintCache.current.get(item.id)
      if (cached) return cached
      const url = item.thumbnails?.[0]?.medium?.url
      if (!url) return null
      const blob = await fetchThumbnailAsBlob(url)
      const fp = blob ? await calculateFingerprint(blob, item.id) : null
      if (fp) fingerprintCache.current.set(item.id, fp)
      return fp
    }

    try {
      // Referentie-fingerprint van de huidige foto.
      const refFp = await getFingerprint(photo)
      if (!refFp) {
        showToast('Kon huidige foto niet analyseren')
        return
      }

      // Scan alleen binnen de actieve periodefilter. Zet je een van/tot-bereik,
      // dan doorzoekt "Vind vergelijkbare" alleen die foto's — veel sneller dan
      // de hele map.
      const others = filteredPhotos.filter(p => p.id !== photo.id)
      const queue = [...others]
      const matches: DriveItem[] = []
      let processed = 0

      const worker = async () => {
        while (true) {
          if (abortRef.current) break
          const p = queue.shift()
          if (!p) break
          const fp = await getFingerprint(p)
          if (fp && isSimilar(refFp, fp, thresholdHash, thresholdColor)) matches.push(p)
          processed++
          setScanProgress(others.length ? Math.round((processed / others.length) * 100) : 100)
        }
      }
      await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker))

      if (abortRef.current) return

      // Toon altijd het resultatenscherm — ook bij 0 matches, zodat duidelijk is
      // dat de scan klaar is en wat hij heeft doorzocht.
      setScannedCount(others.length)
      setSimilarPhotos([photo, ...matches])
      setShowSimilarSheet(true)
    } finally {
      setIsScanning(false)
    }
  }

  const cancelScan = () => {
    abortRef.current = true
    setIsScanning(false)
  }

  const handleSimilarDone = (processedIds: string[]) => {
    const processedSet = new Set(processedIds)
    // Bepaal vóór verwijderen waar we daarna verder moeten: de eerstvolgende
    // foto die nog in de lijst zit op of na de huidige positie.
    const survivorsBefore = filteredPhotos
      .slice(0, filteredIndex)
      .filter(p => !processedSet.has(p.id)).length
    processedIds.forEach(id => removePhotoById(id))
    setShowSimilarSheet(false)
    setSimilarPhotos([])
    setFilteredIndex(survivorsBefore)
  }

  const handlePhotoTouchStart = (e: React.TouchEvent) => {
    if (busy) return
    const t = e.touches[0]
    swipeTouchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handlePhotoTouchMove = (e: React.TouchEvent) => {
    if (!swipeTouchStart.current || busy) return
    const t = e.touches[0]
    const dx = t.clientX - swipeTouchStart.current.x
    const dy = t.clientY - swipeTouchStart.current.y
    if (!isActivelySwiping && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      setIsActivelySwiping(true)
    }
    setSwipeDelta({ x: dx, y: dy })
  }

  const handlePhotoTouchEnd = () => {
    const { x, y } = swipeDelta
    const absX = Math.abs(x)
    const absY = Math.abs(y)
    const wasActive = isActivelySwiping

    setIsActivelySwiping(false)
    setSwipeDelta({ x: 0, y: 0 })
    swipeTouchStart.current = null

    if (!wasActive) return
    if (absX >= SWIPE_COMMIT && absX >= absY) {
      if (x < 0) handleDelete()
      else handleKeep()
    } else if (y < 0 && absY >= SWIPE_COMMIT && absY > absX) {
      if (lastFolder) handleMoveToLastFolder()
      else setShowFolderSheet(true)
    }
  }

  const storedThumb = photo?.thumbnails?.[0]?.large?.url ?? photo?.thumbnails?.[0]?.medium?.url
  const thumbnail = storedThumb ?? (photo ? thumbCache[photo.id] : undefined) ?? null

  const handleThumbError = () => {
    if (!photo) return
    setBrokenThumbs(s => new Set(s).add(photo.id))
    setThumbCache(c => { const n = { ...c }; delete n[photo.id]; return n })
  }

  useEffect(() => {
    if (!photo || storedThumb || thumbCache[photo.id]) return
    getItemThumbnails(msalInstance, account, photo.id).then(t => {
      const url = t?.large?.url ?? t?.medium?.url
      if (url) setThumbCache(c => ({ ...c, [photo.id]: url }))
    })
  }, [photo?.id])

  // Houd de ref synchroon met de meest recente handlers (geen stale closures in listener).
  useEffect(() => {
    keyHandlers.current = { handleDelete, handleKeep, handleUndo }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setFilteredIndex(i => Math.max(0, i - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          keyHandlers.current.handleKeep()
          break
        case 'Delete':
          e.preventDefault()
          keyHandlers.current.handleDelete()
          break
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            keyHandlers.current.handleUndo()
          }
          break
        case 'm':
        case 'M':
          e.preventDefault()
          setSidebarOpen(true)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Swipe-berekeningen voor touch layout
  const swipeAbsX = Math.abs(swipeDelta.x)
  const swipeAbsY = Math.abs(swipeDelta.y)
  const swipeHoriz = swipeAbsX >= swipeAbsY
  const swipeLeftCommitted  = isActivelySwiping && swipeDelta.x <= -SWIPE_COMMIT
  const swipeRightCommitted = isActivelySwiping && swipeDelta.x >= SWIPE_COMMIT
  const swipeUpCommitted    = isActivelySwiping && swipeDelta.y <= -SWIPE_COMMIT && !swipeHoriz

  const photoSwipeTransform = (() => {
    if (!isActivelySwiping) return 'none'
    if (swipeHoriz) {
      const sign = swipeDelta.x < 0 ? -1 : 1
      const tx = swipeAbsX <= SWIPE_COMMIT
        ? swipeDelta.x * 0.85
        : sign * (SWIPE_COMMIT * 0.85 + (swipeAbsX - SWIPE_COMMIT) * 0.12)
      return `translateX(${tx}px) rotate(${tx * 0.015}deg)`
    } else {
      const sign = swipeDelta.y < 0 ? -1 : 1
      const ty = swipeAbsY <= SWIPE_COMMIT
        ? swipeDelta.y * 0.85
        : sign * (SWIPE_COMMIT * 0.85 + (swipeAbsY - SWIPE_COMMIT) * 0.12)
      return `translateY(${ty}px)`
    }
  })()

  const progressPct = total > 0 ? (filteredIndex / total) * 100 : 0

  // ── Klaar / leeg scherm ──────────────────────────────────────────────────
  if (done || !photo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6 bg-fluent-bg-primary">
        {total > 0 || filterActive ? (
          <>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.25)' }}
            >
              <svg className="w-7 h-7 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-fluent-text-primary">
                {filterActive && total === 0 ? 'Geen foto\'s in dit bereik' : 'Klaar!'}
              </h2>
              <p className="text-fluent-text-secondary text-sm mt-1">
                {filterActive && total === 0
                  ? 'Pas het filter aan om andere foto\'s te zien.'
                  : `Je hebt alle ${total} foto's in dit bereik beoordeeld.`}
              </p>
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-fluent-text-primary">Geen foto's gevonden</h2>
            <p className="text-fluent-text-secondary text-sm mt-1">Deze map bevat geen afbeeldingen.</p>
          </div>
        )}
        <div className="flex gap-3">
          {filterActive && (
            <button
              onClick={clearFilter}
              className="border border-fluent-border-strong text-fluent-text-secondary hover:bg-fluent-bg-hover px-5 py-2 text-sm transition-colors"
              style={{ borderRadius: 2 }}
            >
              Wis filter
            </button>
          )}
          <button
            onClick={onBack}
            className="bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold px-5 py-2 text-sm transition-colors"
            style={{ borderRadius: 2 }}
          >
            Andere map kiezen
          </button>
        </div>
      </div>
    )
  }

  // ── TOUCH LAYOUT ────────────────────────────────────────────────────────
  if (isTouch) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#080809' }}>

        {/* Topbalk */}
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0 h-12"
          style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
        >
          <button onClick={onBack} className="text-fluent-text-secondary p-2 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="flex-1 text-sm font-semibold text-fluent-text-primary truncate text-center">
            {currentFolderName}
          </span>
          <button
            onClick={() => setShowTouchFilter(v => !v)}
            className={`p-2 transition-colors ${showTouchFilter ? 'text-fluent-accent' : 'text-fluent-text-secondary'}`}
            title="Filter"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          </button>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0 tabular-nums">
            {filteredIndex + 1}/{total}{!filterActive && !fullyLoaded && '+'}
          </span>
        </div>

        {/* Filter balk (inklapbaar) */}
        {showTouchFilter && availableYears.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm flex-shrink-0"
            style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
          >
            <span className="text-fluent-text-secondary text-xs font-semibold">Van</span>
            <select
              value={fromYear ?? ''}
              onChange={e => { setFromYear(e.target.value ? +e.target.value : null); setFromMonth(null) }}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-2 py-1 text-sm"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle jaren</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={fromMonth ?? ''}
              onChange={e => setFromMonth(e.target.value ? +e.target.value : null)}
              disabled={!fromYear}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-2 py-1 text-sm disabled:opacity-40"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-fluent-text-secondary text-xs font-semibold">Tot</span>
            <select
              value={toYear ?? ''}
              onChange={e => { setToYear(e.target.value ? +e.target.value : null); setToMonth(null) }}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-2 py-1 text-sm"
              style={{ borderRadius: 2 }}
            >
              <option value="">Heden</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={toMonth ?? ''}
              onChange={e => setToMonth(e.target.value ? +e.target.value : null)}
              disabled={!toYear}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-2 py-1 text-sm disabled:opacity-40"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            {filterActive && (
              <button onClick={clearFilter} className="text-fluent-danger text-sm px-2">× Wis</button>
            )}
          </div>
        )}

        {/* Voortgangsbalk */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }}
          />
        </div>

        {/* Foto — swipe-gebied */}
        <div
          className="flex-1 min-h-0 relative overflow-hidden select-none touch-none"
          onTouchStart={handlePhotoTouchStart}
          onTouchMove={handlePhotoTouchMove}
          onTouchEnd={handlePhotoTouchEnd}
        >
          {isScanning && <ScanOverlay progress={scanProgress} onCancel={cancelScan} />}
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: photoSwipeTransform,
              transition: isActivelySwiping ? 'none' : 'transform 0.3s ease-out',
              willChange: 'transform',
            }}
          >
            {thumbnail && !brokenThumbs.has(photo.id)
              ? <img src={thumbnail} alt={photo.name} onError={handleThumbError} className="w-full h-full object-contain" draggable={false} />
              : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: '#111114' }}>
                  <span className="text-fluent-text-secondary text-sm px-6 text-center">{photo.name}</span>
                </div>
              )
            }
          </div>

          {/* Swipe-links: verwijderen */}
          {isActivelySwiping && swipeDelta.x < -SWIPE_HINT && (
            <div
              className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none"
              style={{
                backgroundColor: swipeLeftCommitted
                  ? 'rgba(209,52,56,0.85)'
                  : `rgba(209,52,56,${Math.min(0.25, swipeAbsX / SWIPE_COMMIT * 0.25)})`,
              }}
            >
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeLeftCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeLeftCommitted ? 'bg-white/20' : 'bg-fluent-danger'}`}>
                  <TrashIcon />
                </div>
                {swipeLeftCommitted && <span className="text-sm font-semibold">Loslaten om te verwijderen</span>}
              </div>
            </div>
          )}

          {/* Swipe-rechts: volgende */}
          {isActivelySwiping && swipeDelta.x > SWIPE_HINT && (
            <div
              className="absolute inset-0 flex items-center justify-start pl-10 pointer-events-none"
              style={{
                backgroundColor: swipeRightCommitted
                  ? 'rgba(16,124,16,0.85)'
                  : `rgba(16,124,16,${Math.min(0.25, swipeDelta.x / SWIPE_COMMIT * 0.25)})`,
              }}
            >
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeRightCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeRightCommitted ? 'bg-white/20' : 'bg-fluent-success'}`}>
                  <NextIcon />
                </div>
                {swipeRightCommitted && <span className="text-sm font-semibold">Loslaten voor volgende</span>}
              </div>
            </div>
          )}

          {/* Swipe-omhoog: verplaatsen */}
          {isActivelySwiping && swipeDelta.y < -SWIPE_HINT && !swipeHoriz && (
            <div
              className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none"
              style={{
                backgroundColor: swipeUpCommitted
                  ? 'rgba(0,120,212,0.85)'
                  : `rgba(0,120,212,${Math.min(0.25, swipeAbsY / SWIPE_COMMIT * 0.25)})`,
              }}
            >
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeUpCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeUpCommitted ? 'bg-white/20' : 'bg-fluent-accent'}`}>
                  <FolderIcon />
                </div>
                {swipeUpCommitted && <span className="text-sm font-semibold">Loslaten om te verplaatsen</span>}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div
          className="px-4 py-2 text-center flex-shrink-0"
          style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}
        >
          <p className="text-fluent-text-secondary text-xs truncate">{photo.name}</p>
          <PhotoMeta photo={photo} />
        </div>

        {/* Preset-mappen */}
        {presets.length > 0 && (
          <div
            className="flex-shrink-0 px-3 py-2 flex gap-2 overflow-x-auto"
            style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}
          >
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleMove({ id: preset.id, name: preset.name } as DriveItem)}
                disabled={busy}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-fluent-accent-light text-fluent-accent text-sm font-medium border border-fluent-accent disabled:opacity-40 active:bg-fluent-accent active:text-white transition-colors"
                style={{ borderRadius: 2 }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <span className="max-w-[100px] truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actie-balk */}
        <div
          className="flex-shrink-0 flex items-stretch"
          style={{ height: 72, background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}
        >
          <TouchActionBtn onClick={handleUndo} disabled={busy || undoStack.length === 0} label="Ongedaan" color="secondary">
            <UndoIcon />
          </TouchActionBtn>
          <TouchActionBtn onClick={() => setFilteredIndex(i => Math.max(0, i - 1))} disabled={filteredIndex === 0 || busy} label="Vorige" color="secondary">
            <PrevIcon />
          </TouchActionBtn>
          <TouchActionBtn onClick={handleDelete} disabled={busy} label="Verwijderen" color="danger">
            <TrashIcon />
          </TouchActionBtn>
          <TouchActionBtn
            onClick={lastFolder ? handleMoveToLastFolder : () => setShowFolderSheet(true)}
            disabled={busy}
            label={lastFolder ? lastFolder.name : 'Verplaatsen'}
            color="primary"
          >
            <FolderIcon />
          </TouchActionBtn>
          <TouchActionBtn onClick={handleKeep} disabled={busy} label="Volgende" color="success">
            <NextIcon />
          </TouchActionBtn>
        </div>

        {/* Vind vergelijkbare */}
        <div
          className="flex-shrink-0 px-3 py-2"
          style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}
        >
          <SimilarControls
            onFind={handleFindSimilar}
            disabled={busy || isScanning || !photo.thumbnails?.[0]?.medium?.url}
            showSliders={!showSimilarSheet}
            thresholdHash={thresholdHash}
            setThresholdHash={setThresholdHash}
            thresholdColor={thresholdColor}
            setThresholdColor={setThresholdColor}
          />
        </div>

        {lastFolder && (
          <button
            onClick={() => setShowFolderSheet(true)}
            className="flex-shrink-0 text-fluent-text-secondary text-xs py-2 text-center hover:bg-fluent-bg-hover transition-colors"
            style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}
          >
            Andere map kiezen
          </button>
        )}

        {/* Bottom sheet — mappen */}
        {showFolderSheet && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end">
            <div className="flex-1 bg-black/40" onClick={() => setShowFolderSheet(false)} />
            <div
              className="flex flex-col"
              style={{ height: '60vh', borderRadius: '12px 12px 0 0', background: 'var(--color-bg-primary)' }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="font-semibold text-fluent-text-primary">Verplaatsen naar</span>
                <button onClick={() => setShowFolderSheet(false)} className="text-fluent-text-secondary p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <FolderSidebar
                  msalInstance={msalInstance}
                  account={account}
                  onMove={handleMove}
                  disabled={busy}
                  initialBreadcrumb={lastFolderBreadcrumb}
                />
              </div>
            </div>
          </div>
        )}

        {toast && <UndoToast message={toast.message} onUndo={handleUndo} />}
        {showPaywall && <PaywallModal photosTriaged={currentUser?.photosTriaged ?? 200} onBack={onBack} />}
        {showSimilarSheet && (
          <SimilarPhotosSheet
            photos={similarPhotos}
            scannedCount={scannedCount}
            msalInstance={msalInstance}
            account={account}
            onClose={() => { setShowSimilarSheet(false); setSimilarPhotos([]) }}
            onDone={handleSimilarDone}
          />
        )}
      </div>
    )
  }

  // ── DESKTOP LAYOUT ───────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: '#080809' }}>

      {/* Sidebar — mapnavigatie */}
      <div className={`flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <FolderSidebar
          key={lastFolderBreadcrumb.map(c => c.id).join('/')}
          msalInstance={msalInstance}
          account={account}
          onMove={handleMove}
          disabled={busy}
          initialBreadcrumb={lastFolderBreadcrumb}
        />
      </div>

      {/* Hoofd kolom */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0 h-10"
          style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors"
            style={{ borderRadius: 2 }}
            title="Sidebar (M)"
          >
            <SidebarIcon />
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-fluent-text-secondary hover:text-fluent-text-primary text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>
          <span className="text-fluent-text-primary text-sm font-medium truncate flex-1 text-center">
            {currentFolderName}
          </span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0 tabular-nums">
            {filteredIndex + 1} / {total}{!filterActive && !fullyLoaded && '+'}
          </span>
        </div>

        {/* Filterbalk */}
        {availableYears.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 text-xs"
            style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
          >
            <span className="text-fluent-text-secondary font-semibold">Van</span>
            <select
              value={fromYear ?? ''}
              onChange={e => { setFromYear(e.target.value ? +e.target.value : null); setFromMonth(null) }}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-1.5 py-0.5 text-xs"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle jaren</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={fromMonth ?? ''}
              onChange={e => setFromMonth(e.target.value ? +e.target.value : null)}
              disabled={!fromYear}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-1.5 py-0.5 text-xs disabled:opacity-40"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-fluent-text-secondary font-semibold ml-2">Tot</span>
            <select
              value={toYear ?? ''}
              onChange={e => { setToYear(e.target.value ? +e.target.value : null); setToMonth(null) }}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-1.5 py-0.5 text-xs"
              style={{ borderRadius: 2 }}
            >
              <option value="">Heden</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={toMonth ?? ''}
              onChange={e => setToMonth(e.target.value ? +e.target.value : null)}
              disabled={!toYear}
              className="border border-fluent-border bg-fluent-bg-primary text-fluent-text-primary px-1.5 py-0.5 text-xs disabled:opacity-40"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            {filterActive && (
              <button onClick={clearFilter} className="ml-2 text-fluent-text-secondary hover:text-fluent-danger transition-colors">
                × Wis
              </button>
            )}
            <span className="ml-auto text-fluent-text-disabled">
              {total} foto{total !== 1 ? '\'s' : ''}
            </span>
          </div>
        )}

        {/* Voortgangsbalk */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }}
          />
        </div>

        {/* Foto-area — altijd donker */}
        <div className="flex-1 min-h-0 flex items-center justify-center relative" style={{ background: '#06060a' }}>
          {isScanning && <ScanOverlay progress={scanProgress} onCancel={cancelScan} />}
          {thumbnail && !brokenThumbs.has(photo.id) ? (
            <img
              src={thumbnail}
              alt={photo.name}
              onError={handleThumbError}
              className="w-full h-full object-contain"
              style={{ boxShadow: '0 2px 32px rgba(0,0,0,0.6)' }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center border border-fluent-border"
              style={{ background: '#111116' }}
            >
              <div className="flex flex-col items-center gap-3">
                <svg className="w-10 h-10 text-fluent-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-fluent-text-secondary text-xs text-center px-4">{photo.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}
        >
          {/* Filename + metadata */}
          <div className="text-center mb-2.5 space-y-0.5">
            <p className="text-fluent-text-secondary text-xs truncate">{photo.name}</p>
            <PhotoMeta photo={photo} />
          </div>

          {/* Preset-mappen */}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-2.5">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleMove({ id: preset.id, name: preset.name } as DriveItem)}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-fluent-accent-light text-fluent-accent text-xs font-medium border border-fluent-accent hover:bg-fluent-accent hover:text-white disabled:opacity-40 transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <span className="max-w-[120px] truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Actie-knoppen */}
          <div className="flex items-end justify-center gap-2">
            <ActionBtn
              onClick={handleUndo}
              disabled={busy || undoStack.length === 0}
              variant="secondary"
              label="Ongedaan"
              hint="Ctrl+Z"
            >
              <UndoIcon />
            </ActionBtn>
            <ActionBtn
              onClick={() => setFilteredIndex(i => Math.max(0, i - 1))}
              disabled={filteredIndex === 0 || busy}
              variant="secondary"
              label="Vorige"
              hint="←"
            >
              <PrevIcon />
            </ActionBtn>
            <ActionBtn
              onClick={handleDelete}
              disabled={busy}
              variant="danger"
              label="Verwijderen"
              hint="Del"
            >
              <TrashIcon />
            </ActionBtn>
            <ActionBtn
              onClick={handleKeep}
              disabled={busy}
              variant="success"
              label="Volgende"
              hint="→"
            >
              <NextIcon />
            </ActionBtn>
          </div>

          {/* Vind vergelijkbare */}
          <SimilarControls
            onFind={handleFindSimilar}
            disabled={busy || isScanning || !photo.thumbnails?.[0]?.medium?.url}
            showSliders={!showSimilarSheet}
            thresholdHash={thresholdHash}
            setThresholdHash={setThresholdHash}
            thresholdColor={thresholdColor}
            setThresholdColor={setThresholdColor}
          />
        </div>
      </div>

      {toast && <UndoToast message={toast.message} onUndo={handleUndo} />}
      {showPaywall && <PaywallModal photosTriaged={currentUser?.photosTriaged ?? 200} onBack={onBack} />}
      {showSimilarSheet && (
        <SimilarPhotosSheet
          photos={similarPhotos}
          scannedCount={scannedCount}
          msalInstance={msalInstance}
          account={account}
          onClose={() => { setShowSimilarSheet(false); setSimilarPhotos([]) }}
          onDone={handleSimilarDone}
        />
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TouchActionBtn({ onClick, disabled, label, color, children }: {
  onClick: () => void
  disabled: boolean
  label: string
  color: 'danger' | 'success' | 'primary' | 'secondary'
  children: React.ReactNode
}) {
  const styles = {
    danger:    'text-fluent-danger active:bg-fluent-danger active:text-white',
    success:   'text-fluent-success active:bg-fluent-success active:text-white',
    primary:   'text-fluent-accent active:bg-fluent-accent active:text-white',
    secondary: 'text-fluent-text-secondary active:bg-fluent-bg-hover',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30 ${styles[color]}`}
    >
      {children}
      <span className="text-xs font-medium truncate max-w-full px-1">{label}</span>
    </button>
  )
}

function ActionBtn({ onClick, disabled, variant, label, hint, children }: {
  onClick: () => void
  disabled: boolean
  variant: 'danger' | 'success' | 'secondary'
  label: string
  hint?: string
  children: React.ReactNode
}) {
  const isPrimary = variant === 'danger' || variant === 'success'
  const btnClass = isPrimary
    ? variant === 'danger'
      ? 'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-fluent-danger hover:bg-red-700 disabled:opacity-30 transition-colors'
      : 'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-fluent-accent hover:bg-fluent-accent-hover disabled:opacity-30 transition-colors'
    : 'flex items-center gap-1.5 px-4 py-2.5 text-sm text-fluent-text-secondary bg-fluent-bg-secondary border border-fluent-border-strong hover:bg-fluent-bg-hover hover:text-fluent-text-primary disabled:opacity-30 transition-colors'

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        disabled={disabled}
        className={btnClass}
        style={{ borderRadius: 2 }}
      >
        {children}
        {isPrimary && <span>{label}</span>}
      </button>
      <span className="text-xs text-fluent-text-secondary">{isPrimary ? '' : label}</span>
      {hint && <span className="text-[10px] text-fluent-text-disabled font-mono">{hint}</span>}
    </div>
  )
}

// Scan-overlay over de huidige foto tijdens "Vind vergelijkbare".
function ScanOverlay({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <span className="text-white text-sm font-semibold">Vergelijkbare foto's zoeken…</span>
      <div className="w-full max-w-xs">
        <div className="h-[4px]" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <div className="h-full transition-all duration-200" style={{ width: `${progress}%`, background: 'var(--color-accent)' }} />
        </div>
        <div className="text-center text-white/70 text-xs mt-1 tabular-nums">{progress}%</div>
      </div>
      <button
        onClick={onCancel}
        className="px-5 py-2 text-sm font-semibold text-white border border-white/40 hover:bg-white/10 transition-colors"
        style={{ borderRadius: 2 }}
      >
        Annuleren
      </button>
    </div>
  )
}

// "Vind vergelijkbare"-knop + de twee gevoeligheidsschuiven.
function SimilarControls({
  onFind, disabled, showSliders,
  thresholdHash, setThresholdHash, thresholdColor, setThresholdColor,
}: {
  onFind: () => void
  disabled: boolean
  showSliders: boolean
  thresholdHash: number
  setThresholdHash: (v: number) => void
  thresholdColor: number
  setThresholdColor: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 mt-2.5">
      <button
        onClick={onFind}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-fluent-accent bg-fluent-accent-light border border-fluent-accent hover:bg-fluent-accent hover:text-white disabled:opacity-40 transition-colors"
        style={{ borderRadius: 2 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
        Vind vergelijkbare
      </button>
      {showSliders && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-fluent-text-secondary">
          <label className="flex items-center gap-2">
            <span className="w-10 text-right">Vorm</span>
            <span className="text-fluent-text-disabled">Strikt</span>
            <input
              type="range" min={2} max={20} step={1} value={thresholdHash}
              onChange={e => setThresholdHash(+e.target.value)}
              className="accent-fluent-accent"
            />
            <span className="text-fluent-text-disabled">Ruim</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-10 text-right">Kleur</span>
            <span className="text-fluent-text-disabled">Ruim</span>
            <input
              type="range" min={0.7} max={0.99} step={0.01} value={thresholdColor}
              onChange={e => setThresholdColor(+e.target.value)}
              className="accent-fluent-accent"
            />
            <span className="text-fluent-text-disabled">Strikt</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
function NextIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
    </svg>
  )
}
function PrevIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
function UndoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" />
    </svg>
  )
}
function SidebarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
function FolderIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}
