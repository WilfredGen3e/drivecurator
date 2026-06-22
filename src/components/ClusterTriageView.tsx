import { useState, useRef, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem, getItemThumbnails } from '../services/graphService'
import { useIsTouch } from '../hooks/useIsTouch'
import FolderSidebar, { Crumb } from './FolderSidebar'
import SimilarPhotosSheet from './SimilarPhotosSheet'
import { SimilarControls, ScanOverlay, NoMatchBanner } from './findSimilarUI'
import { useFindSimilar } from '../hooks/useFindSimilar'
import { createLogger } from '../services/logService'
import Button from './ui/Button'

const log = createLogger('smartsort')

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

type UndoAction = { type: 'move'; item: DriveItem; previousFolderId: string } | { type: 'delete'; item: DriveItem }

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  clusterLabel: string
  initialPhotos: DriveItem[]
  sourceFolderId?: string
  onDone: (remaining: DriveItem[]) => void
}

function PhotoMeta({ photo }: { photo: DriveItem }) {
  const date = photo.photo?.takenDateTime ?? photo.fileSystemInfo?.createdDateTime
  const camera = [photo.photo?.cameraMake, photo.photo?.cameraModel].filter(Boolean).join(' ')
  const size = photo.size ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : null
  const formatted = date
    ? new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
    : null
  if (!formatted && !camera && !size) return null
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-fluent-text-secondary flex-wrap">
      {formatted && <span>{formatted}</span>}
      {camera && <span>· {camera}</span>}
      {size && <span>· {size}</span>}
    </div>
  )
}

export default function ClusterTriageView({ msalInstance, account, clusterLabel, initialPhotos, sourceFolderId, onDone }: Props) {
  const [photos, setPhotos] = useState<DriveItem[]>(initialPhotos)
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTouch = useIsTouch()

  const [lastFolder, setLastFolder] = useState<DriveItem | null>(null)
  const [lastFolderBreadcrumb, setLastFolderBreadcrumb] = useState<Crumb[]>([])
  const [showFolderSheet, setShowFolderSheet] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [presets, setPresets] = useState<FolderPreset[]>(() => loadPresets())
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({})
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set())

  const [swipeDelta, setSwipeDelta] = useState({ x: 0, y: 0 })
  const [isActivelySwiping, setIsActivelySwiping] = useState(false)
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null)

  const photo = photos[index]
  const total = photos.length
  const removedCount = initialPhotos.length - total

  // "Vind vergelijkbare" — zelfde gedeelde logica als de handmatige triage.
  const sim = useFindSimilar({
    msalInstance, account,
    photos,
    current: photo,
    thumbCache,
    onProcessed: (processedIds) => {
      const set = new Set(processedIds)
      const next = photos.filter(p => !set.has(p.id))
      setPhotos(next)
      setIndex(i => Math.min(i, Math.max(0, next.length - 1)))
    },
  })

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const removeCurrentPhoto = (id: string) => {
    const next = photos.filter(p => p.id !== id)
    setPhotos(next)
    setIndex(i => Math.min(i, Math.max(0, next.length - 1)))
  }

  const handleDelete = async () => {
    if (!photo || busy) return
    setBusy(true)
    try {
      await deleteItem(msalInstance, account, photo.id)
      setUndoStack(s => [...s, { type: 'delete', item: photo }])
      removeCurrentPhoto(photo.id)
      log.info(`Cluster-triage verwijderd: "${photo.name}"`, { id: photo.id })
      showToast(`"${photo.name}" verwijderd`)
    } catch (e) {
      log.error(`Cluster-triage verwijderen mislukt: "${photo.name}"`, e)
      throw e
    } finally { setBusy(false) }
  }

  const handleMove = async (targetFolder: DriveItem, breadcrumb?: Crumb[]) => {
    if (!photo || busy) return
    setBusy(true)
    setShowFolderSheet(false)
    try {
      await moveItem(msalInstance, account, photo.id, targetFolder.id)
      setUndoStack(s => [...s, { type: 'move', item: photo, previousFolderId: sourceFolderId ?? '' }])
      setLastFolder(targetFolder)
      if (breadcrumb !== undefined) setLastFolderBreadcrumb(breadcrumb)
      addToPresets({ id: targetFolder.id, name: targetFolder.name })
      setPresets(loadPresets())
      removeCurrentPhoto(photo.id)
      log.info(`Cluster-triage verplaatst: "${photo.name}" → "${targetFolder.name}"`, { id: photo.id })
      showToast(`Verplaatst naar "${targetFolder.name}"`)
    } catch (e) {
      log.error(`Cluster-triage verplaatsen mislukt: "${photo.name}" → "${targetFolder.name}"`, e)
      throw e
    } finally { setBusy(false) }
  }

  const handleUndo = async () => {
    if (undoStack.length === 0 || busy) return
    const action = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    setBusy(true)
    try {
      if (action.type === 'move' && action.previousFolderId) {
        await moveItem(msalInstance, account, action.item.id, action.previousFolderId)
        setPhotos(p => [...p, action.item])
        log.info(`Cluster-triage verplaatsing ongedaan: "${action.item.name}"`, { id: action.item.id })
        showToast('Verplaatsing ongedaan gemaakt')
      } else {
        showToast("Verwijderde foto's staan in de OneDrive prullenbak")
      }
    } catch (e) {
      log.error('Cluster-triage ongedaan maken mislukt', e)
      throw e
    } finally { setBusy(false) }
  }

  const handleMoveToLastFolder = () => { if (lastFolder) handleMove(lastFolder) }
  const handleNext = () => { if (index < total - 1) setIndex(i => i + 1) }
  const handlePrev = () => { if (index > 0) setIndex(i => i - 1) }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (busy) return
    const t = e.touches[0]
    swipeTouchStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeTouchStart.current || busy) return
    const t = e.touches[0]
    const dx = t.clientX - swipeTouchStart.current.x
    const dy = t.clientY - swipeTouchStart.current.y
    if (!isActivelySwiping && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) setIsActivelySwiping(true)
    setSwipeDelta({ x: dx, y: dy })
  }

  const handleTouchEnd = () => {
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
      else handleNext()
    } else if (y < 0 && absY >= SWIPE_COMMIT && absY > absX) {
      if (lastFolder) handleMoveToLastFolder()
      else setShowFolderSheet(true)
    }
  }

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

  const progressPct = total > 0 ? (index / total) * 100 : 0

  // ── Klaar ─────────────────────────────────────────────────────────────────
  if (!photo) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6 bg-fluent-bg-secondary">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-success-light)' }}
        >
          <svg className="w-7 h-7 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-fluent-text-primary">Klaar met doorlopen</p>
          {removedCount > 0 && (
            <p className="text-fluent-text-secondary text-sm mt-1">
              {removedCount} foto{removedCount !== 1 ? "'s" : ''} verwijderd of verplaatst
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => onDone(photos)}>
          Terug naar overzicht
        </Button>
      </div>
    )
  }

  // ── Touch layout ──────────────────────────────────────────────────────────
  if (isTouch) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--color-canvas)' }}>
        {/* Topbalk */}
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0 h-12"
          style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
        >
          <button onClick={() => onDone(photos)} className="text-fluent-text-secondary p-2 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="flex-1 text-sm font-semibold text-fluent-text-primary truncate text-center">{clusterLabel}</span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0 tabular-nums">{index + 1}/{total}</span>
        </div>

        {/* Voortgangsbalk */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--color-border)' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
        </div>

        {/* Foto — swipe-gebied */}
        <div
          className="flex-1 min-h-0 relative overflow-hidden select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ transform: photoSwipeTransform, transition: isActivelySwiping ? 'none' : 'transform 0.3s ease-out', willChange: 'transform' }}
          >
            {thumbnail && !brokenThumbs.has(photo.id)
              ? <img src={thumbnail} alt={photo.name} onError={handleThumbError} className="w-full h-full object-contain" draggable={false} />
              : <div className="w-full h-full flex items-center justify-center" style={{ background: '#111114' }}><span className="text-fluent-text-secondary text-sm px-6 text-center">{photo.name}</span></div>
            }
          </div>

          {isActivelySwiping && swipeDelta.x < -SWIPE_HINT && (
            <div className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none" style={{ backgroundColor: swipeLeftCommitted ? 'rgba(255,59,48,0.85)' : `rgba(255,59,48,${Math.min(0.25, swipeAbsX / SWIPE_COMMIT * 0.25)})` }}>
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeLeftCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeLeftCommitted ? 'bg-white/20' : 'bg-fluent-danger'}`}><TrashIcon /></div>
                {swipeLeftCommitted && <span className="text-sm font-semibold">Loslaten om te verwijderen</span>}
              </div>
            </div>
          )}
          {isActivelySwiping && swipeDelta.x > SWIPE_HINT && (
            <div className="absolute inset-0 flex items-center justify-start pl-10 pointer-events-none" style={{ backgroundColor: swipeRightCommitted ? 'rgba(52,199,89,0.85)' : `rgba(52,199,89,${Math.min(0.25, swipeDelta.x / SWIPE_COMMIT * 0.25)})` }}>
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeRightCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeRightCommitted ? 'bg-white/20' : 'bg-fluent-success'}`}><NextIcon /></div>
                {swipeRightCommitted && <span className="text-sm font-semibold">Loslaten voor volgende</span>}
              </div>
            </div>
          )}
          {isActivelySwiping && swipeDelta.y < -SWIPE_HINT && !swipeHoriz && (
            <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none" style={{ backgroundColor: swipeUpCommitted ? 'rgba(0,122,255,0.85)' : `rgba(0,122,255,${Math.min(0.25, swipeAbsY / SWIPE_COMMIT * 0.25)})` }}>
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeUpCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeUpCommitted ? 'bg-white/20' : 'bg-fluent-accent'}`}><FolderIcon /></div>
                {swipeUpCommitted && <span className="text-sm font-semibold">Loslaten om te verplaatsen</span>}
              </div>
            </div>
          )}

          {sim.isScanning && <ScanOverlay progress={sim.scanProgress} onCancel={sim.cancelScan} />}
        </div>

        {/* ── Onderste bedieningspaneel — één blok i.p.v. losse strepen ── */}
        <div className="flex-shrink-0 bg-fluent-bg-primary rounded-t-3xl shadow-float pb-safe">

          {/* Greep + metadata */}
          <div className="pt-2.5 pb-1 text-center">
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-fluent-border-strong" />
            <p className="text-fluent-text-primary text-sm font-medium truncate px-5">{photo.name}</p>
            <PhotoMeta photo={photo} />
          </div>

          {/* Secundaire acties — twee nette gelijke pillen */}
          <div className="flex gap-2 px-3 pt-1">
            <Button variant="neutral" size="sm" className="flex-1" onClick={handleUndo} disabled={busy || undoStack.length === 0} icon={<UndoIcon />}>Ongedaan</Button>
            <Button variant="neutral" size="sm" className="flex-1" onClick={handlePrev} disabled={index === 0 || busy} icon={<PrevIcon />}>Vorige</Button>
          </div>

          {/* Preset-mappen als Apple-pillen */}
          {presets.length > 0 && (
            <div className="px-3 pt-1.5 flex gap-2 overflow-x-auto">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleMove({ id: preset.id, name: preset.name } as DriveItem)}
                  disabled={busy}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-fluent-accent-light text-fluent-accent text-sm font-medium disabled:opacity-40 active:scale-[0.97] transition-transform"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                  <span className="max-w-[120px] truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hoofdacties — 3 grote knoppen */}
          <div className="flex gap-2.5 px-3 pt-2.5">
            <Button variant="destructive" className="flex-1 min-w-0 flex-col gap-1 !min-h-[60px] !px-2 !text-xs" onClick={handleDelete} disabled={busy} icon={<TrashIcon />}>Verwijder</Button>
            <Button
              variant="primary"
              className="flex-1 min-w-0 flex-col gap-1 !min-h-[60px] !px-2 !text-xs"
              onClick={lastFolder ? handleMoveToLastFolder : () => setShowFolderSheet(true)}
              disabled={busy}
              icon={<FolderIcon />}
            >
              <span className="max-w-full truncate">{lastFolder ? lastFolder.name : 'Verplaats'}</span>
            </Button>
            <Button variant="success" className="flex-1 min-w-0 flex-col gap-1 !min-h-[60px] !px-2 !text-xs" onClick={handleNext} disabled={index >= total - 1 || busy} icon={<NextIcon />}>Volgende</Button>
          </div>

          {/* Andere map kiezen (alleen als er een vaste doelmap is) */}
          {lastFolder && (
            <div className="px-3 pt-1.5 text-center">
              <Button variant="ghost" size="sm" onClick={() => setShowFolderSheet(true)}>Andere map kiezen…</Button>
            </div>
          )}

          {/* Vind vergelijkbare — compact */}
          <div className="px-3 pb-1">
            <SimilarControls
              onFind={sim.findSimilar}
              disabled={busy || sim.isScanning || !photo}
              showSliders={false}
              thresholdHash={sim.thresholdHash} setThresholdHash={sim.setThresholdHash}
              thresholdColor={sim.thresholdColor} setThresholdColor={sim.setThresholdColor}
              lastScan={sim.lastScan}
            />
          </div>
        </div>

        {/* Folder sheet */}
        {showFolderSheet && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end">
            <div className="flex-1 bg-black/40 animate-fade" onClick={() => setShowFolderSheet(false)} />
            <div className="flex flex-col rounded-t-3xl pb-safe animate-sheet" style={{ height: '60vh', background: 'var(--color-bg-primary)' }}>
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-semibold text-fluent-text-primary">Verplaatsen naar</span>
                <button onClick={() => setShowFolderSheet(false)} className="text-fluent-text-secondary p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <FolderSidebar key={lastFolderBreadcrumb.map(c => c.id).join('/')} msalInstance={msalInstance} account={account} onMove={handleMove} disabled={busy} initialBreadcrumb={lastFolderBreadcrumb} />
              </div>
            </div>
          </div>
        )}

        {toast && <ToastBar message={toast} />}
        {sim.noMatch && <NoMatchBanner info={sim.noMatch} onClose={sim.clearNoMatch} />}
        {sim.showSheet && (
          <SimilarPhotosSheet
            photos={sim.similarPhotos}
            msalInstance={msalInstance}
            account={account}
            onClose={sim.closeSheet}
            onDone={sim.handleDone}
          />
        )}
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: 'var(--color-canvas)' }}>
      {/* Sidebar */}
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

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbalk */}
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0 h-10"
          style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
        >
          <button onClick={() => setSidebarOpen(v => !v)} className="p-2 rounded-lg text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors">
            <SidebarIcon />
          </button>
          <button onClick={() => onDone(photos)} className="flex items-center gap-1 text-fluent-text-secondary hover:text-fluent-text-primary text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Terug
          </button>
          <span className="text-fluent-text-primary text-sm font-medium truncate flex-1 text-center">{clusterLabel}</span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0 tabular-nums">{index + 1} / {total}</span>
        </div>

        {/* Voortgangsbalk */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--color-border)' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
        </div>

        {/* Foto — altijd donker */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center" style={{ background: '#06060a' }}>
          {sim.isScanning && <ScanOverlay progress={sim.scanProgress} onCancel={sim.cancelScan} />}
          {thumbnail && !brokenThumbs.has(photo.id) ? (
            <img src={thumbnail} alt={photo.name} onError={handleThumbError} className="w-full h-full object-contain" style={{ boxShadow: '0 2px 32px rgba(0,0,0,0.6)' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: '#111116' }}>
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
        <div className="flex-shrink-0 px-5 py-3" style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}>
          <div className="text-center mb-2.5 space-y-0.5">
            <p className="text-fluent-text-secondary text-xs truncate">{photo.name}</p>
            <PhotoMeta photo={photo} />
          </div>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-2.5">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleMove({ id: preset.id, name: preset.name } as DriveItem)}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fluent-accent-light text-fluent-accent text-xs font-medium hover:brightness-95 active:scale-[0.97] disabled:opacity-40 transition-all"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                  <span className="max-w-[120px] truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end justify-center gap-2">
            <DesktopBtn onClick={handleUndo} disabled={busy || undoStack.length === 0} variant="secondary" label="Ongedaan"><UndoIcon /></DesktopBtn>
            <DesktopBtn onClick={handlePrev} disabled={index === 0 || busy} variant="secondary" label="Vorige"><PrevIcon /></DesktopBtn>
            <DesktopBtn onClick={handleDelete} disabled={busy} variant="danger" label="Verwijderen"><TrashIcon /></DesktopBtn>
            <DesktopBtn onClick={handleNext} disabled={index >= total - 1 || busy} variant="success" label="Volgende"><NextIcon /></DesktopBtn>
          </div>
          <SimilarControls
            onFind={sim.findSimilar}
            disabled={busy || sim.isScanning || !photo}
            showSliders={!sim.showSheet}
            thresholdHash={sim.thresholdHash} setThresholdHash={sim.setThresholdHash}
            thresholdColor={sim.thresholdColor} setThresholdColor={sim.setThresholdColor}
            lastScan={sim.lastScan}
          />
        </div>
      </div>

      {toast && <ToastBar message={toast} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToastBar({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-full shadow-float z-50"
      style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', whiteSpace: 'nowrap' }}
    >
      {message}
    </div>
  )
}

function DesktopBtn({ onClick, disabled, variant, label, children }: {
  onClick: () => void; disabled: boolean; variant: 'danger' | 'success' | 'secondary'; label: string; children: React.ReactNode
}) {
  const isPrimary = variant === 'danger' || variant === 'success'
  const btnClass = isPrimary
    ? variant === 'danger'
      ? 'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-fluent-danger hover:brightness-95 active:scale-[0.97] disabled:opacity-30 transition-all'
      : 'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-fluent-success hover:brightness-95 active:scale-[0.97] disabled:opacity-30 transition-all'
    : 'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-fluent-text-primary bg-fluent-bg-secondary hover:bg-fluent-bg-hover active:scale-[0.97] disabled:opacity-30 transition-all'

  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick} disabled={disabled} className={btnClass}>
        {children}
        {isPrimary && <span>{label}</span>}
      </button>
      <span className="text-xs text-fluent-text-secondary">{isPrimary ? '' : label}</span>
    </div>
  )
}

function TrashIcon()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> }
function UndoIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" /></svg> }
function NextIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg> }
function PrevIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg> }
function FolderIcon()  { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg> }
function SidebarIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg> }
