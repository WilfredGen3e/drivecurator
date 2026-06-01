import { useRef, useState, useMemo, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem } from '../services/graphService'
import { incrementUsage, FreeLimitReachedError } from '../services/apiService'
import PaywallModal from './PaywallModal'
import { useAppStore } from '../store/useAppStore'
import FolderSidebar from './FolderSidebar'
import UndoToast from './UndoToast'

const MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

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

  // Beschikbare jaren uit geladen foto's
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    photos.forEach(p => { const d = getPhotoDate(p); if (d) years.add(d.getFullYear()) })
    return Array.from(years).sort((a, b) => b - a)
  }, [photos])

  // Gefilterde + gesorteerde foto's
  const filteredPhotos = useMemo(() => {
    const fromDate = fromYear ? new Date(fromYear, (fromMonth ?? 1) - 1, 1) : null
    const toDate = toYear
      ? toMonth
        ? new Date(toYear, toMonth, 0, 23, 59, 59) // laatste dag van toMonth
        : new Date(toYear, 11, 31, 23, 59, 59)
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

  // Reset index als filter verandert
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
    } finally {
      setBusy(false)
    }
  }

  const handleKeep = async () => {
    if (!photo || busy) return
    setBusy(true)
    try {
      if (!await checkUsage()) return
      setFilteredIndex(i => i + 1)
    } finally {
      setBusy(false)
    }
  }

  const handleMove = async (targetFolder: DriveItem) => {
    if (!photo || busy) return
    setBusy(true)
    try {
      if (!await checkUsage()) return
      await moveItem(msalInstance, account, photo.id, targetFolder.id)
      pushUndo({ type: 'move', item: photo, previousFolderId: currentFolderId! })
      removePhotoById(photo.id)
      showToast(`Verplaatst naar "${targetFolder.name}"`)
    } finally {
      setBusy(false)
    }
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
    } finally {
      setBusy(false)
    }
  }

  const thumbnail = photo?.thumbnails?.[0]?.large?.url ?? photo?.thumbnails?.[0]?.medium?.url

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

  return (
    <div className="flex h-full">
      {/* sidebar */}
      <div className={`flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <FolderSidebar msalInstance={msalInstance} account={account} onMove={handleMove} disabled={busy} />
      </div>

      {/* hoofdpaneel */}
      <div className="flex-1 flex flex-col min-w-0 bg-fluent-bg-primary">
        {/* topbalk */}
        <div className="flex items-center gap-2 px-3 border-b border-fluent-border flex-shrink-0 h-10">
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-1.5 text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors" style={{ borderRadius: 2 }} title="Sidebar tonen/verbergen">
            <SidebarIcon />
          </button>
          <button onClick={onBack} className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm transition-colors">
            ← Terug
          </button>
          <span className="text-fluent-text-primary text-sm font-medium truncate flex-1 text-center">{currentFolderName}</span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0">
            {filteredIndex + 1} / {total}{!filterActive && !fullyLoaded && '+'}
          </span>
        </div>

        {/* filter balk */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0 text-xs">
            <span className="text-fluent-text-secondary font-semibold">Van</span>
            <select
              value={fromYear ?? ''}
              onChange={e => { setFromYear(e.target.value ? +e.target.value : null); setFromMonth(null) }}
              className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle jaren</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={fromMonth ?? ''}
              onChange={e => setFromMonth(e.target.value ? +e.target.value : null)}
              disabled={!fromYear}
              className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs disabled:opacity-40"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            <span className="text-fluent-text-secondary font-semibold ml-2">Tot</span>
            <select
              value={toYear ?? ''}
              onChange={e => { setToYear(e.target.value ? +e.target.value : null); setToMonth(null) }}
              className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs"
              style={{ borderRadius: 2 }}
            >
              <option value="">Heden</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={toMonth ?? ''}
              onChange={e => setToMonth(e.target.value ? +e.target.value : null)}
              disabled={!toYear}
              className="border border-fluent-border bg-white text-fluent-text-primary px-1.5 py-0.5 text-xs disabled:opacity-40"
              style={{ borderRadius: 2 }}
            >
              <option value="">Alle maanden</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            {filterActive && (
              <button onClick={clearFilter} className="ml-2 text-fluent-text-secondary hover:text-fluent-danger transition-colors" title="Wis filter">× Wis</button>
            )}
            <span className="ml-auto text-fluent-text-disabled">{total} foto{total !== 1 ? '\'s' : ''}</span>
          </div>
        )}

        {/* voortgangsbalk */}
        <div className="h-0.5 bg-fluent-border flex-shrink-0">
          <div className="h-full bg-fluent-accent transition-all duration-300" style={{ width: `${total > 0 ? (filteredIndex / total) * 100 : 0}%` }} />
        </div>

        {/* foto */}
        <div className="flex-1 min-h-0 px-4 pt-3 bg-fluent-bg-secondary">
          {thumbnail ? (
            <img src={thumbnail} alt={photo.name} className="w-full h-full object-contain" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
          ) : (
            <div className="w-full h-full bg-fluent-bg-hover border border-fluent-border flex items-center justify-center">
              <span className="text-fluent-text-secondary text-xs text-center px-4">{photo.name}</span>
            </div>
          )}
        </div>

        {/* metadata + knoppen */}
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

function ActionBtn({ onClick, disabled, variant, label, children }: {
  onClick: () => void
  disabled: boolean
  variant: 'danger' | 'success' | 'secondary'
  label: string
  children: React.ReactNode
}) {
  const styles = {
    danger:    'bg-fluent-danger-light text-fluent-danger hover:bg-fluent-danger hover:text-white border border-fluent-danger',
    success:   'bg-fluent-success-light text-fluent-success hover:bg-fluent-success hover:text-white border border-fluent-success',
    secondary: 'bg-fluent-bg-secondary text-fluent-text-secondary hover:bg-fluent-bg-hover border border-fluent-border-strong',
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} disabled={disabled} className={`w-12 h-12 flex items-center justify-center transition-colors disabled:opacity-30 ${styles[variant]}`} style={{ borderRadius: 2 }}>
        {children}
      </button>
      <span className="text-xs text-fluent-text-secondary">{label}</span>
    </div>
  )
}

function TrashIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> }
function NextIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg> }
function PrevIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg> }
function UndoIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" /></svg> }
function SidebarIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg> }
