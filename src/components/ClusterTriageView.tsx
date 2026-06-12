import { useState, useRef, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem, getItemThumbnails } from '../services/graphService'
import { useIsTouch } from '../hooks/useIsTouch'
import FolderSidebar, { Crumb } from './FolderSidebar'

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
      showToast(`"${photo.name}" verwijderd`)
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
      showToast(`Verplaatst naar "${targetFolder.name}"`)
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
        showToast('Verplaatsing ongedaan gemaakt')
      } else {
        showToast("Verwijderde foto's staan in de OneDrive prullenbak")
      }
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
          style={{ background: 'rgba(16,124,16,0.1)', border: '1px solid rgba(16,124,16,0.25)' }}
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
        <button
          onClick={() => onDone(photos)}
          className="bg-fluent-accent hover:bg-fluent-accent-hover text-white px-5 py-2 text-sm font-semibold transition-colors"
          style={{ borderRadius: 2 }}
        >
          Terug naar overzicht
        </button>
      </div>
    )
  }

  // ── Touch layout ──────────────────────────────────────────────────────────
  if (isTouch) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#080809' }}>
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
        <div className="h-[3px] flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
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
            <div className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none" style={{ backgroundColor: swipeLeftCommitted ? 'rgba(209,52,56,0.85)' : `rgba(209,52,56,${Math.min(0.25, swipeAbsX / SWIPE_COMMIT * 0.25)})` }}>
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeLeftCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeLeftCommitted ? 'bg-white/20' : 'bg-fluent-danger'}`}><TrashIcon /></div>
                {swipeLeftCommitted && <span className="text-sm font-semibold">Loslaten om te verwijderen</span>}
              </div>
            </div>
          )}
          {isActivelySwiping && swipeDelta.x > SWIPE_HINT && (
            <div className="absolute inset-0 flex items-center justify-start pl-10 pointer-events-none" style={{ backgroundColor: swipeRightCommitted ? 'rgba(16,124,16,0.85)' : `rgba(16,124,16,${Math.min(0.25, swipeDelta.x / SWIPE_COMMIT * 0.25)})` }}>
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeRightCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeRightCommitted ? 'bg-white/20' : 'bg-fluent-success'}`}><NextIcon /></div>
                {swipeRightCommitted && <span className="text-sm font-semibold">Loslaten voor volgende</span>}
              </div>
            </div>
          )}
          {isActivelySwiping && swipeDelta.y < -SWIPE_HINT && !swipeHoriz && (
            <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none" style={{ backgroundColor: swipeUpCommitted ? 'rgba(0,120,212,0.85)' : `rgba(0,120,212,${Math.min(0.25, swipeAbsY / SWIPE_COMMIT * 0.25)})` }}>
              <div className={`text-white flex flex-col items-center gap-2 transition-transform duration-150 ${swipeUpCommitted ? 'scale-110' : 'scale-100'}`}>
                <div className={`rounded-full p-4 ${swipeUpCommitted ? 'bg-white/20' : 'bg-fluent-accent'}`}><FolderIcon /></div>
                {swipeUpCommitted && <span className="text-sm font-semibold">Loslaten om te verplaatsen</span>}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="px-4 py-2 text-center flex-shrink-0" style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}>
          <p className="text-fluent-text-secondary text-xs truncate">{photo.name}</p>
          <PhotoMeta photo={photo} />
        </div>

        {/* Preset-mappen */}
        {presets.length > 0 && (
          <div className="flex-shrink-0 px-3 py-2 flex gap-2 overflow-x-auto" style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}>
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleMove({ id: preset.id, name: preset.name } as DriveItem)}
                disabled={busy}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-fluent-accent-light text-fluent-accent text-sm font-medium border border-fluent-accent disabled:opacity-40 active:bg-fluent-accent active:text-white transition-colors"
                style={{ borderRadius: 2 }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                <span className="max-w-[100px] truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actiebalk */}
        <div className="flex-shrink-0 flex items-stretch" style={{ height: 72, background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}>
          <TouchBtn onClick={handleUndo} disabled={busy || undoStack.length === 0} label="Ongedaan" color="secondary"><UndoIcon /></TouchBtn>
          <TouchBtn onClick={handlePrev} disabled={index === 0 || busy} label="Vorige" color="secondary"><PrevIcon /></TouchBtn>
          <TouchBtn onClick={handleDelete} disabled={busy} label="Verwijderen" color="danger"><TrashIcon /></TouchBtn>
          <TouchBtn onClick={lastFolder ? handleMoveToLastFolder : () => setShowFolderSheet(true)} disabled={busy} label={lastFolder ? lastFolder.name : 'Verplaatsen'} color="primary"><FolderIcon /></TouchBtn>
          <TouchBtn onClick={handleNext} disabled={index >= total - 1 || busy} label="Volgende" color="success"><NextIcon /></TouchBtn>
        </div>

        {lastFolder && (
          <button onClick={() => setShowFolderSheet(true)} className="flex-shrink-0 text-fluent-text-secondary text-xs py-2 text-center hover:bg-fluent-bg-hover transition-colors" style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}>
            Andere map kiezen
          </button>
        )}

        {/* Folder sheet */}
        {showFolderSheet && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end">
            <div className="flex-1 bg-black/40" onClick={() => setShowFolderSheet(false)} />
            <div className="flex flex-col" style={{ height: '60vh', borderRadius: '12px 12px 0 0', background: 'var(--color-bg-primary)' }}>
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
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: '#080809' }}>
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
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors" style={{ borderRadius: 2 }}>
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
        <div className="h-[3px] flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
        </div>

        {/* Foto — altijd donker */}
        <div className="flex-1 min-h-0 flex items-center justify-center" style={{ background: '#06060a' }}>
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
                  className="flex items-center gap-1.5 px-3 py-1 bg-fluent-accent-light text-fluent-accent text-xs font-medium border border-fluent-accent hover:bg-fluent-accent hover:text-white disabled:opacity-40 transition-colors"
                  style={{ borderRadius: 2 }}
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2 z-50"
      style={{ background: 'var(--color-text-primary)', borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}
    >
      {message}
    </div>
  )
}

function TouchBtn({ onClick, disabled, label, color, children }: {
  onClick: () => void; disabled: boolean; label: string
  color: 'danger' | 'success' | 'primary' | 'secondary'; children: React.ReactNode
}) {
  const styles = {
    danger:    'text-fluent-danger active:bg-fluent-danger active:text-white',
    success:   'text-fluent-success active:bg-fluent-success active:text-white',
    primary:   'text-fluent-accent active:bg-fluent-accent active:text-white',
    secondary: 'text-fluent-text-secondary active:bg-fluent-bg-hover',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-30 ${styles[color]}`}>
      {children}
      <span className="text-xs font-medium truncate max-w-full px-1">{label}</span>
    </button>
  )
}

function DesktopBtn({ onClick, disabled, variant, label, children }: {
  onClick: () => void; disabled: boolean; variant: 'danger' | 'success' | 'secondary'; label: string; children: React.ReactNode
}) {
  const isPrimary = variant === 'danger' || variant === 'success'
  const btnClass = isPrimary
    ? variant === 'danger'
      ? 'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-fluent-danger hover:bg-red-700 disabled:opacity-30 transition-colors'
      : 'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-fluent-accent hover:bg-fluent-accent-hover disabled:opacity-30 transition-colors'
    : 'flex items-center gap-1.5 px-4 py-2.5 text-sm text-fluent-text-secondary bg-fluent-bg-secondary border border-fluent-border-strong hover:bg-fluent-bg-hover hover:text-fluent-text-primary disabled:opacity-30 transition-colors'

  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick} disabled={disabled} className={btnClass} style={{ borderRadius: 2 }}>
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
