import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, moveItem, deleteItem } from '../services/graphService'
import { PhotoCluster } from '../services/clusterService'
import FolderSidebar, { Crumb } from './FolderSidebar'
import Button from './ui/Button'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  cluster: PhotoCluster
  onDone: (remaining: DriveItem[]) => void
  onTriage: () => void
}

export default function ClusterGridView({ msalInstance, account, cluster, onDone, onTriage }: Props) {
  const [photos, setPhotos] = useState<DriveItem[]>(cluster.photos)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showSheet, setShowSheet] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lastBreadcrumb, setLastBreadcrumb] = useState<Crumb[]>([])
  const [moveProgress, setMoveProgress] = useState<{ done: number; total: number } | null>(null)
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const busy = moveProgress !== null || deleteProgress !== null
  const hasSelection = selectedIds.size > 0
  const allSelected = selectedIds.size === photos.length && photos.length > 0
  const actionCount = hasSelection ? selectedIds.size : photos.length

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const toggleSelect = (id: string) => {
    if (busy) return
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(photos.map(p => p.id)))
  }

  // Escape sluit een open overlay (bevestiging of mappen-sheet)
  useEffect(() => {
    if (!showSheet && !showDeleteConfirm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowDeleteConfirm(false)
      setShowSheet(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSheet, showDeleteConfirm])

  // ── Gedeelde bulk-worker ───────────────────────────────────────────────────

  const runWorkers = async <T,>(
    targets: DriveItem[],
    setProgress: Dispatch<SetStateAction<{ done: number; total: number } | null>>,
    action: (photo: DriveItem) => Promise<T>,
  ) => {
    setProgress({ done: 0, total: targets.length })
    const queue = [...targets]
    let done = 0
    const worker = async () => {
      while (true) {
        const photo = queue.shift()
        if (!photo) break
        try { await action(photo) } catch { /* skip */ }
        done++
        setProgress(prev => prev ? { ...prev, done } : null)
      }
    }
    await Promise.all(Array.from({ length: 5 }, worker))
    setProgress(null)
  }

  // ── Acties ─────────────────────────────────────────────────────────────────

  const handleMove = async (targetFolder: DriveItem, breadcrumb: Crumb[]) => {
    setShowSheet(false)
    setLastBreadcrumb(breadcrumb)
    const targets = hasSelection ? photos.filter(p => selectedIds.has(p.id)) : photos
    await runWorkers(targets, setMoveProgress, photo => moveItem(msalInstance, account, photo.id, targetFolder.id))
    const movedIds = new Set(targets.map(p => p.id))
    const remaining = photos.filter(p => !movedIds.has(p.id))
    showToast(`${targets.length} foto${targets.length !== 1 ? "'s" : ''} verplaatst naar "${targetFolder.name}"`)
    if (remaining.length === 0) { setTimeout(() => onDone([]), 1200) }
    else { setPhotos(remaining); setSelectedIds(new Set()) }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    const targets = hasSelection ? photos.filter(p => selectedIds.has(p.id)) : photos
    await runWorkers(targets, setDeleteProgress, photo => deleteItem(msalInstance, account, photo.id))
    const deletedIds = new Set(targets.map(p => p.id))
    const remaining = photos.filter(p => !deletedIds.has(p.id))
    showToast(`${targets.length} foto${targets.length !== 1 ? "'s" : ''} naar de prullenbak verplaatst`)
    if (remaining.length === 0) { setTimeout(() => onDone([]), 1200) }
    else { setPhotos(remaining); setSelectedIds(new Set()) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-fluent-bg-secondary">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0">
        <button onClick={() => onDone(photos)} className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm flex items-center gap-1 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fluent-bg-primary">
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Terug
        </button>
        <span aria-hidden="true" className="text-fluent-text-disabled text-sm">·</span>
        <span className="text-sm font-semibold text-fluent-text-primary truncate flex-1">{cluster.label}</span>
        {hasSelection
          ? <button onClick={toggleSelectAll} className="text-xs text-fluent-accent hover:underline flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent">{allSelected ? 'Geen' : 'Alles'}</button>
          : <span className="text-xs text-fluent-text-disabled flex-shrink-0">{photos.length} foto{photos.length !== 1 ? "'s" : ''}</span>
        }
      </div>

      {/* Selectiebalk */}
      {hasSelection && (
        <div className="flex-shrink-0 px-4 py-2 bg-fluent-accent-light border-b border-fluent-accent flex items-center justify-between">
          <span className="text-sm font-semibold text-fluent-accent">{selectedIds.size} geselecteerd</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-fluent-accent hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent">Selectie opheffen</button>
        </div>
      )}

      {/* Voortgang */}
      {(moveProgress || deleteProgress) && (() => {
        const p = moveProgress ?? deleteProgress!
        return (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={p.total}
            aria-valuenow={p.done}
            aria-label={moveProgress ? 'Verplaatsen' : 'Verwijderen'}
            className="flex-shrink-0"
            style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
              <p className="text-xs text-fluent-text-secondary">{moveProgress ? 'Verplaatsen' : 'Verwijderen'}…</p>
              <p className="text-xs text-fluent-text-disabled tabular-nums">{p.done} / {p.total}</p>
            </div>
            <div className="h-[3px]" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all duration-200" style={{ width: `${(p.done / p.total) * 100}%`, background: 'var(--color-accent)' }} />
            </div>
          </div>
        )
      })()}

      {/* Thumbnail grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {photos.map(photo => {
            const thumb = photo.thumbnails?.[0]?.medium?.url
            const selected = selectedIds.has(photo.id)
            return (
              <button
                key={photo.id}
                onClick={() => toggleSelect(photo.id)}
                disabled={busy}
                aria-pressed={selected}
                aria-label={photo.name}
                className="aspect-square bg-fluent-bg-hover overflow-hidden relative rounded-lg disabled:pointer-events-none active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent focus-visible:ring-offset-1 focus-visible:ring-offset-fluent-bg-secondary"
                style={{ outline: selected ? '2px solid var(--color-accent)' : 'none', outlineOffset: '-2px' }}
              >
                {thumb
                  ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center p-1"><span className="text-fluent-text-disabled text-xs text-center leading-tight truncate">{photo.name}</span></div>
                }
                {selected && (
                  <div aria-hidden="true" className="absolute inset-0 bg-fluent-accent/20 flex items-start justify-end p-1 pointer-events-none">
                    <div className="w-5 h-5 rounded-full bg-fluent-accent flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actiebalk */}
      {!busy && (
        <div className="flex-shrink-0 bg-fluent-bg-primary border-t border-fluent-border px-4 py-3 pb-safe space-y-2">
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1 min-w-0"
              onClick={() => setShowSheet(true)}
              icon={<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>}
            >
              <span className="truncate">{hasSelection ? `Verplaatsen (${selectedIds.size})` : 'Verplaatsen'}</span>
            </Button>
            <Button
              variant="destructive"
              className="flex-1 min-w-0"
              onClick={() => setShowDeleteConfirm(true)}
              icon={<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
            >
              <span className="truncate">{hasSelection ? `Verwijderen (${selectedIds.size})` : 'Verwijderen'}</span>
            </Button>
          </div>
          {!hasSelection && (
            <Button variant="neutral" fullWidth onClick={onTriage}>
              Foto voor foto
            </Button>
          )}
        </div>
      )}

      {/* Bevestigingsdialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="cluster-delete-title" className="relative w-full max-w-sm p-6 space-y-4 rounded-2xl bg-fluent-bg-primary shadow-float animate-rise">
            <h2 id="cluster-delete-title" className="font-semibold text-fluent-text-primary text-base">Weet u het zeker?</h2>
            <p className="text-sm text-fluent-text-secondary">
              {actionCount} foto{actionCount !== 1 ? "'s" : ''} worden naar de <strong>OneDrive-prullenbak</strong> verplaatst. U kunt ze daar nog terugzetten.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Annuleren</Button>
              <Button variant="destructive" onClick={handleDelete}>Ja, verwijderen</Button>
            </div>
          </div>
        </div>
      )}

      {/* Folder sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div aria-hidden="true" className="flex-1 bg-black/40 animate-fade" onClick={() => setShowSheet(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="cluster-move-title" className="flex flex-col rounded-t-3xl pb-safe animate-sheet" style={{ height: '60vh', background: 'var(--color-bg-primary)' }}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="min-w-0">
                <p id="cluster-move-title" className="font-semibold text-fluent-text-primary text-sm">Verplaatsen naar</p>
                <p className="text-fluent-text-secondary text-xs truncate">{cluster.label} · {actionCount} foto{actionCount !== 1 ? "'s" : ''}</p>
              </div>
              <button onClick={() => setShowSheet(false)} aria-label="Sluiten" className="text-fluent-text-secondary p-1 flex-shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent">
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <FolderSidebar key={lastBreadcrumb.map(c => c.id).join('/')} msalInstance={msalInstance} account={account} onMove={(f, bc) => handleMove(f, bc)} disabled={false} initialBreadcrumb={lastBreadcrumb} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-fluent-text-primary text-fluent-bg-primary text-sm px-4 py-2 rounded-full shadow-float z-50">{toast}</div>
      )}
    </div>
  )
}
