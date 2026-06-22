import { useState, useRef, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem, getItemDownloadUrl } from '../services/graphService'
import { useIsTouch } from '../hooks/useIsTouch'
import FolderSidebar, { Crumb } from './FolderSidebar'
import { createLogger } from '../services/logService'
import Button from './ui/Button'

const log = createLogger('triage')

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
  folderName: string
  initialVideos: DriveItem[]
  sourceFolderId: string
  onBack: () => void
}

function formatDuration(ms?: number): string | null {
  if (!ms || ms <= 0) return null
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VideoMeta({ video }: { video: DriveItem }) {
  const date = video.fileSystemInfo?.createdDateTime ?? video.photo?.takenDateTime
  const duration = formatDuration(video.video?.duration)
  const resolution = video.video?.width && video.video?.height ? `${video.video.width}×${video.video.height}` : null
  const size = video.size ? `${(video.size / 1024 / 1024).toFixed(1)} MB` : null
  const formatted = date
    ? new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
    : null
  if (!formatted && !duration && !resolution && !size) return null
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-fluent-text-secondary flex-wrap">
      {formatted && <span>{formatted}</span>}
      {duration && <span>· {duration}</span>}
      {resolution && <span>· {resolution}</span>}
      {size && <span>· {size}</span>}
    </div>
  )
}

export default function VideoTriageView({ msalInstance, account, folderName, initialVideos, sourceFolderId, onBack }: Props) {
  const [videos, setVideos] = useState<DriveItem[]>(initialVideos)
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

  // Afspeel-URL's worden on-demand opgehaald (verlopen na ~1 uur, maar dat is ruim
  // genoeg voor één sessie). Gecachet per video-id zodat heen-en-weer bladeren niet
  // opnieuw fetcht.
  const [urlCache, setUrlCache] = useState<Record<string, string>>({})
  const [urlError, setUrlError] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)

  const video = videos[index]
  const total = videos.length
  const removedCount = initialVideos.length - total
  const videoUrl = video ? urlCache[video.id] ?? null : null

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const removeCurrent = (id: string) => {
    const next = videos.filter(v => v.id !== id)
    setVideos(next)
    setIndex(i => Math.min(i, Math.max(0, next.length - 1)))
  }

  // Haal de afspeel-URL voor de huidige video op (indien nog niet gecachet).
  useEffect(() => {
    setPlaybackError(false)
    if (!video || urlCache[video.id]) { setUrlError(false); return }
    let cancelled = false
    setUrlError(false)
    getItemDownloadUrl(msalInstance, account, video.id).then(url => {
      if (cancelled) return
      if (url) setUrlCache(c => ({ ...c, [video.id]: url }))
      else setUrlError(true)
    })
    return () => { cancelled = true }
  }, [video?.id])

  const handleDelete = async () => {
    if (!video || busy) return
    setBusy(true)
    try {
      await deleteItem(msalInstance, account, video.id)
      setUndoStack(s => [...s, { type: 'delete', item: video }])
      removeCurrent(video.id)
      log.info(`Video verwijderd: "${video.name}"`, { id: video.id, map: folderName })
      showToast(`"${video.name}" verwijderd`)
    } catch (e) {
      log.error(`Video verwijderen mislukt: "${video.name}"`, e)
      throw e
    } finally { setBusy(false) }
  }

  const handleMove = async (targetFolder: DriveItem, breadcrumb?: Crumb[]) => {
    if (!video || busy) return
    setBusy(true)
    setShowFolderSheet(false)
    try {
      await moveItem(msalInstance, account, video.id, targetFolder.id)
      setUndoStack(s => [...s, { type: 'move', item: video, previousFolderId: sourceFolderId }])
      setLastFolder(targetFolder)
      if (breadcrumb !== undefined) setLastFolderBreadcrumb(breadcrumb)
      addToPresets({ id: targetFolder.id, name: targetFolder.name })
      setPresets(loadPresets())
      removeCurrent(video.id)
      log.info(`Video verplaatst: "${video.name}" → "${targetFolder.name}"`, { id: video.id })
      showToast(`Verplaatst naar "${targetFolder.name}"`)
    } catch (e) {
      log.error(`Video verplaatsen mislukt: "${video.name}" → "${targetFolder.name}"`, e)
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
        setVideos(v => [...v, action.item])
        log.info(`Video verplaatsing ongedaan: "${action.item.name}"`, { id: action.item.id })
        showToast('Verplaatsing ongedaan gemaakt')
      } else {
        showToast('Verwijderde video\'s staan in de OneDrive prullenbak')
      }
    } catch (e) {
      log.error('Video ongedaan maken mislukt', e)
      throw e
    } finally { setBusy(false) }
  }

  const handleMoveToLastFolder = () => { if (lastFolder) handleMove(lastFolder) }
  const handleNext = () => { if (index < total - 1) setIndex(i => i + 1) }
  const handlePrev = () => { if (index > 0) setIndex(i => i - 1) }

  const progressPct = total > 0 ? (index / total) * 100 : 0

  // Speler — gedeeld tussen beide layouts.
  const player = (
    <div className="relative w-full h-full flex items-center justify-center" style={{ background: '#06060a' }}>
      {videoUrl && !playbackError ? (
        <video
          key={video?.id}
          src={videoUrl}
          poster={video?.thumbnails?.[0]?.large?.url ?? video?.thumbnails?.[0]?.medium?.url}
          controls
          playsInline
          onError={() => setPlaybackError(true)}
          className="max-w-full max-h-full"
        />
      ) : playbackError ? (
        <div className="flex flex-col items-center gap-3 px-6 text-center max-w-sm">
          <PlayIcon />
          <span className="text-fluent-text-secondary text-sm">
            Deze video kan niet in de browser worden afgespeeld (formaat niet ondersteund — vaak bij .mov).
            Je kunt 'm wel verwijderen of verplaatsen op basis van naam en details hieronder.
          </span>
        </div>
      ) : urlError ? (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <PlayIcon />
          <span className="text-fluent-text-secondary text-sm">Kon deze video niet laden. Probeer de volgende.</span>
        </div>
      ) : (
        <div className="w-7 h-7 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )

  // ── Klaar / leeg ────────────────────────────────────────────────────────────
  if (!video) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6 bg-fluent-bg-secondary">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--color-success-light)' }}>
          <svg className="w-7 h-7 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-fluent-text-primary">
            {initialVideos.length === 0 ? 'Geen video\'s gevonden' : 'Klaar met doorlopen'}
          </p>
          <p className="text-fluent-text-secondary text-sm mt-1">
            {initialVideos.length === 0
              ? 'Deze map bevat geen video\'s.'
              : removedCount > 0
                ? `${removedCount} video${removedCount !== 1 ? '\'s' : ''} verwijderd of verplaatst`
                : 'Alle video\'s beoordeeld.'}
          </p>
        </div>
        <Button variant="primary" onClick={onBack}>Terug</Button>
      </div>
    )
  }

  // ── Touch layout ──────────────────────────────────────────────────────────
  if (isTouch) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--color-canvas)' }}>
        {/* Topbalk */}
        <div className="flex items-center gap-2 px-3 flex-shrink-0 h-12" style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={onBack} className="text-fluent-text-secondary p-2 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="flex-1 text-sm font-semibold text-fluent-text-primary truncate text-center">{folderName}</span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0 tabular-nums">{index + 1}/{total}</span>
        </div>

        {/* Voortgangsbalk */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--color-border)' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
        </div>

        {/* Speler */}
        <div className="flex-1 min-h-0">{player}</div>

        {/* Onderste bedieningspaneel */}
        <div className="flex-shrink-0 bg-fluent-bg-primary rounded-t-3xl shadow-float pb-safe">
          <div className="pt-2.5 pb-1 text-center">
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-fluent-border-strong" />
            <p className="text-fluent-text-primary text-sm font-medium truncate px-5">{video.name}</p>
            <VideoMeta video={video} />
          </div>

          {/* Secundaire acties */}
          <div className="flex gap-2 px-3 pt-1">
            <Button variant="neutral" size="sm" className="flex-1" onClick={handleUndo} disabled={busy || undoStack.length === 0} icon={<UndoIcon />}>Ongedaan</Button>
            <Button variant="neutral" size="sm" className="flex-1" onClick={handlePrev} disabled={index === 0 || busy} icon={<PrevIcon />}>Vorige</Button>
          </div>

          {/* Preset-mappen */}
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

          {/* Hoofdacties */}
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

          {lastFolder && (
            <div className="px-3 pt-1.5 pb-1 text-center">
              <Button variant="ghost" size="sm" onClick={() => setShowFolderSheet(true)}>Andere map kiezen…</Button>
            </div>
          )}
          {!lastFolder && <div className="pb-1" />}
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
        <div className="flex items-center gap-2 px-3 flex-shrink-0 h-10" style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setSidebarOpen(v => !v)} className="p-2 rounded-lg text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors">
            <SidebarIcon />
          </button>
          <button onClick={onBack} className="flex items-center gap-1 text-fluent-text-secondary hover:text-fluent-text-primary text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Terug
          </button>
          <span className="text-fluent-text-primary text-sm font-medium truncate flex-1 text-center">{folderName}</span>
          <span className="text-fluent-text-secondary text-sm flex-shrink-0 tabular-nums">{index + 1} / {total}</span>
        </div>

        {/* Voortgangsbalk */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--color-border)' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
        </div>

        {/* Speler */}
        <div className="flex-1 min-h-0">{player}</div>

        {/* Bottom action bar */}
        <div className="flex-shrink-0 px-5 py-3" style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border)' }}>
          <div className="text-center mb-2.5 space-y-0.5">
            <p className="text-fluent-text-secondary text-xs truncate">{video.name}</p>
            <VideoMeta video={video} />
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
            <DesktopBtn onClick={lastFolder ? handleMoveToLastFolder : () => setShowFolderSheet(true)} disabled={busy} variant="secondary" label={lastFolder ? lastFolder.name : 'Verplaats'}><FolderIcon /></DesktopBtn>
            <DesktopBtn onClick={handleNext} disabled={index >= total - 1 || busy} variant="success" label="Volgende"><NextIcon /></DesktopBtn>
          </div>
        </div>
      </div>

      {/* Folder sheet (desktop: alleen als presets-knop "Verplaats" zonder sidebar-keuze) */}
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
      <span className="text-xs text-fluent-text-secondary max-w-[120px] truncate">{isPrimary ? '' : label}</span>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
function TrashIcon()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> }
function UndoIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" /></svg> }
function NextIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg> }
function PrevIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg> }
function FolderIcon()  { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg> }
function SidebarIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg> }
function PlayIcon()    { return <svg className="w-10 h-10 text-fluent-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
