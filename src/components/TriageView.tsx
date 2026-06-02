import { useRef, useState, useMemo, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem } from '../services/graphService'
import { incrementUsage, FreeLimitReachedError } from '../services/apiService'
import PaywallModal from './PaywallModal'
import { useAppStore } from '../store/useAppStore'
import FolderSidebar, { Crumb } from './FolderSidebar'
import UndoToast from './UndoToast'
import { useIsTouch } from '../hooks/useIsTouch'

const MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
const SWIPE_HINT = 30
const SWIPE_COMMIT = 160

function getPhotoDate(photo: DriveItem): Date | null {
  const str = photo.photo?.takenDateTime ?? photo.fileSystemInfo?.createdDateTime
  return str ? new Date(str) : null
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

  const thumbnail = photo?.thumbnails?.[0]?.large?.url ?? photo?.thumbnails?.[0]?.medium?.url

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

  // ── Klaar / leeg scherm ──────────────────────────────────────────────────
  if (done || !photo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6">
        {total > 0 || filterActive ? (
          <>
            <svg className="w-12 h-12 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
          {filterActive && <button onClick={clearFilter} className="border border-fluent-border-strong text-fluent-text-secondary hover:bg-fluent-bg-hover px-5 py-2 text-sm transition-colors" style={{ borderRadius: 2 }}>Wis filter</button>}
          <button onClick={onBack} className="bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold px-5 py-2 text-sm transition-colors" style={{ borderRadius: 2 }}>Andere map kiezen</button>
        </div>
      </div>
    )
  }

  // ── TOUCH LAYOUT ────────────────────────────────────────────────────────
  if (isTouch) {
    return (
      <div className="flex flex-col h-full bg-fluent-bg-secondary">

        {/* Topbalk */}
        <div className="flex items-center gap-2 px-3 bg-fluent-bg-primary border-b border-fluent-border flex-shrink-0 h-12">
          <button onClick={onBack} className="text-fluent-text-secondary p-2 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="flex-1 text-sm font-semibold text-fluent-text-primary truncate text-center">{currentFolderName}</span>
          <button
            onClick={() => setShowTouchFilter(v => !v)}
            className={`p-2 transition-colors ${showTouchFilter ? 'text-fluent-accent' : 'text-fluent-text-secondary'}`}
            title="Filter"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          </button>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0">
            {filteredIndex + 1}/{total}{!filterActive && !fullyLoaded && '+'}
          </span>
        </div>

        {/* Filter balk (inklapbaar) */}
        {showTouchFilter && availableYears.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-fluent-bg-primary border-b border-fluent-border text-sm flex-shrink-0">
            <span className="text-fluent-text-secondary text-xs font-semibold">Van</span>
            <select value={fromYear ?? ''} onChange={e => { setFromYear(e.target.value ? +e.target.value : null); setFromMonth(null) }} className="border border-fluent-border bg-white text-fluent-text-primary px-2 py-1 text-sm rounded-sm">
              <option value="">Alle jaren</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fromMonth ?? ''} onChange={e => setFromMonth(e.target.value ? +e.target.value : null)} disabled={!fromYear} className="border border-fluent-border bg-white text-fluent-text-primary px-2 py-1 text-sm rounded-sm disabled:opacity-40">
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-fluent-text-secondary text-xs font-semibold">Tot</span>
            <select value={toYear ?? ''} onChange={e => { setToYear(e.target.value ? +e.target.value : null); setToMonth(null) }} className="border border-fluent-border bg-white text-fluent-text-primary px-2 py-1 text-sm rounded-sm">
              <option value="">Heden</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={toMonth ?? ''} onChange={e => setToMonth(e.target.value ? +e.target.value : null)} disabled={!toYear} className="border border-fluent-border bg-white text-fluent-text-primary px-2 py-1 text-sm rounded-sm disabled:opacity-40">
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            {filterActive && <button onClick={clearFilter} className="text-fluent-danger text-sm px-2">× Wis</button>}
          </div>
        )}

        {/* Voortgangsbalk */}
        <div className="h-1 bg-fluent-border flex-shrink-0">
          <div className="h-full bg-fluent-accent transition-all duration-300" style={{ width: `${total > 0 ? (filteredIndex / total) * 100 : 0}%` }} />
        </div>

        {/* Foto — swipe-gebied */}
        <div
          className="flex-1 min-h-0 relative overflow-hidden select-none touch-none"
          onTouchStart={handlePhotoTouchStart}
          onTouchMove={handlePhotoTouchMove}
          onTouchEnd={handlePhotoTouchEnd}
        >
          {/* Foto zelf, beweegt mee met swipe + rubber-band voorbij drempel */}
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: photoSwipeTransform,
              transition: isActivelySwiping ? 'none' : 'transform 0.3s ease-out',
              willChange: 'transform',
            }}
          >
            {thumbnail
              ? <img src={thumbnail} alt={photo.name} className="w-full h-full object-contain" draggable={false} />
              : <div className="w-full h-full flex items-center justify-center bg-fluent-bg-hover"><span className="text-fluent-text-secondary text-sm px-6 text-center">{photo.name}</span></div>
            }
          </div>

          {/* Swipe-links: verwijderen */}
          {isActivelySwiping && swipeDelta.x < -SWIPE_HINT && (
            <div
              className="absolute inset-0 flex items-center justify-end pr-10 pointer-events-none transition-colors duration-100"
              style={{
                backgroundColor: swipeLeftCommitted ? 'rgba(209,52,56,0.85)' : `rgba(209,52,56,${Math.min(0.25, swipeAbsX / SWIPE_COMMIT * 0.25)})`,
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
              className="absolute inset-0 flex items-center justify-start pl-10 pointer-events-none transition-colors duration-100"
              style={{
                backgroundColor: swipeRightCommitted ? 'rgba(16,124,16,0.85)' : `rgba(16,124,16,${Math.min(0.25, swipeDelta.x / SWIPE_COMMIT * 0.25)})`,
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
              className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none transition-colors duration-100"
              style={{
                backgroundColor: swipeUpCommitted ? 'rgba(0,120,212,0.85)' : `rgba(0,120,212,${Math.min(0.25, swipeAbsY / SWIPE_COMMIT * 0.25)})`,
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
        <div className="bg-fluent-bg-primary px-4 py-2 text-center flex-shrink-0">
          <p className="text-fluent-text-secondary text-xs truncate">{photo.name}</p>
          <PhotoMeta photo={photo} />
        </div>

        {/* Actie-balk */}
        <div className="bg-fluent-bg-primary border-t border-fluent-border flex-shrink-0 flex items-stretch" style={{ height: 72 }}>
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

        {/* Map-knop onderaan als lastFolder bekend is */}
        {lastFolder && (
          <button
            onClick={() => setShowFolderSheet(true)}
            className="bg-fluent-bg-secondary border-t border-fluent-border text-fluent-text-secondary text-xs py-2 text-center flex-shrink-0 hover:bg-fluent-bg-hover transition-colors"
          >
            Andere map kiezen
          </button>
        )}

        {/* Bottom sheet — mappen */}
        {showFolderSheet && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end">
            <div className="flex-1 bg-black/40" onClick={() => setShowFolderSheet(false)} />
            <div className="bg-white flex flex-col" style={{ height: '60vh', borderRadius: '12px 12px 0 0' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-fluent-border flex-shrink-0">
                <span className="font-semibold text-fluent-text-primary">Verplaatsen naar</span>
                <button onClick={() => setShowFolderSheet(false)} className="text-fluent-text-secondary p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <FolderSidebar msalInstance={msalInstance} account={account} onMove={handleMove} disabled={busy} initialBreadcrumb={lastFolderBreadcrumb} />
              </div>
            </div>
          </div>
        )}

        {toast && <UndoToast message={toast.message} onUndo={handleUndo} />}
        {showPaywall && <PaywallModal photosTriaged={currentUser?.photosTriaged ?? 200} onBack={onBack} />}
      </div>
    )
  }

  // ── DESKTOP LAYOUT ───────────────────────────────────────────────────────
  return (
    <div className="flex h-full">
      <div className={`flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <FolderSidebar key={lastFolderBreadcrumb.map(c => c.id).join('/')} msalInstance={msalInstance} account={account} onMove={handleMove} disabled={busy} initialBreadcrumb={lastFolderBreadcrumb} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-fluent-bg-primary">
        <div className="flex items-center gap-2 px-3 border-b border-fluent-border flex-shrink-0 h-10">
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-1.5 text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors" style={{ borderRadius: 2 }}>
            <SidebarIcon />
          </button>
          <button onClick={onBack} className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm transition-colors">← Terug</button>
          <span className="text-fluent-text-primary text-sm font-medium truncate flex-1 text-center">{currentFolderName}</span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0">
            {filteredIndex + 1} / {total}{!filterActive && !fullyLoaded && '+'}
          </span>
        </div>

        {availableYears.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0 text-xs">
            <span className="text-fluent-text-secondary font-semibold">Van</span>
            <select value={fromYear ?? ''} onChange={e => { setFromYear(e.target.value ? +e.target.value : null); setFromMonth(null) }} className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs" style={{ borderRadius: 2 }}>
              <option value="">Alle jaren</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={fromMonth ?? ''} onChange={e => setFromMonth(e.target.value ? +e.target.value : null)} disabled={!fromYear} className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs disabled:opacity-40" style={{ borderRadius: 2 }}>
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-fluent-text-secondary font-semibold ml-2">Tot</span>
            <select value={toYear ?? ''} onChange={e => { setToYear(e.target.value ? +e.target.value : null); setToMonth(null) }} className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs" style={{ borderRadius: 2 }}>
              <option value="">Heden</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={toMonth ?? ''} onChange={e => setToMonth(e.target.value ? +e.target.value : null)} disabled={!toYear} className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs disabled:opacity-40" style={{ borderRadius: 2 }}>
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            {filterActive && <button onClick={clearFilter} className="ml-2 text-fluent-text-secondary hover:text-fluent-danger transition-colors">× Wis</button>}
            <span className="ml-auto text-fluent-text-disabled">{total} foto{total !== 1 ? '\'s' : ''}</span>
          </div>
        )}

        <div className="h-0.5 bg-fluent-border flex-shrink-0">
          <div className="h-full bg-fluent-accent transition-all duration-300" style={{ width: `${total > 0 ? (filteredIndex / total) * 100 : 0}%` }} />
        </div>

        <div className="flex-1 min-h-0 px-4 pt-3 bg-fluent-bg-secondary">
          {thumbnail
            ? <img src={thumbnail} alt={photo.name} className="w-full h-full object-contain" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
            : <div className="w-full h-full bg-fluent-bg-hover border border-fluent-border flex items-center justify-center"><span className="text-fluent-text-secondary text-xs text-center px-4">{photo.name}</span></div>
          }
        </div>

        <div className="flex-shrink-0 bg-fluent-bg-primary border-t border-fluent-border px-4 py-3 space-y-3">
          <div className="text-center space-y-0.5">
            <p className="text-fluent-text-secondary text-xs truncate">{photo.name}</p>
            <PhotoMeta photo={photo} />
          </div>
          <div className="flex items-center justify-center gap-6">
            <ActionBtn onClick={handleUndo} disabled={busy || undoStack.length === 0} variant="secondary" label="Ongedaan"><UndoIcon /></ActionBtn>
            <ActionBtn onClick={() => setFilteredIndex(i => Math.max(0, i - 1))} disabled={filteredIndex === 0} variant="secondary" label="Vorige"><PrevIcon /></ActionBtn>
            <ActionBtn onClick={handleDelete} disabled={busy} variant="danger" label="Verwijderen"><TrashIcon /></ActionBtn>
            <ActionBtn onClick={handleKeep} disabled={busy} variant="success" label="Volgende"><NextIcon /></ActionBtn>
          </div>
        </div>
      </div>

      {toast && <UndoToast message={toast.message} onUndo={handleUndo} />}
      {showPaywall && <PaywallModal photosTriaged={currentUser?.photosTriaged ?? 200} onBack={onBack} />}
    </div>
  )
}

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

function ActionBtn({ onClick, disabled, variant, label, children }: {
  onClick: () => void; disabled: boolean; variant: 'danger' | 'success' | 'secondary'; label: string; children: React.ReactNode
}) {
  const styles = { danger: 'bg-fluent-danger-light text-fluent-danger hover:bg-fluent-danger hover:text-white border border-fluent-danger', success: 'bg-fluent-success-light text-fluent-success hover:bg-fluent-success hover:text-white border border-fluent-success', secondary: 'bg-fluent-bg-secondary text-fluent-text-secondary hover:bg-fluent-bg-hover border border-fluent-border-strong' }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} disabled={disabled} className={`w-12 h-12 flex items-center justify-center transition-colors disabled:opacity-30 ${styles[variant]}`} style={{ borderRadius: 2 }}>{children}</button>
      <span className="text-xs text-fluent-text-secondary">{label}</span>
    </div>
  )
}

function TrashIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> }
function NextIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg> }
function PrevIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg> }
function UndoIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" /></svg> }
function SidebarIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg> }
function FolderIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg> }
