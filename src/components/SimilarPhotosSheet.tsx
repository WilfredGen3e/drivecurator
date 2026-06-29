import { useState, useEffect } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem } from '../services/graphService'
import FolderSidebar from './FolderSidebar'
import Button from './ui/Button'

interface Props {
  // photos[0] is altijd de referentiefoto; de rest zijn de gevonden matches.
  // Deze sheet wordt alleen geopend als er minstens één match is.
  photos: DriveItem[]
  msalInstance: PublicClientApplication
  account: AccountInfo
  onClose: () => void
  onDone: (processedIds: string[]) => void
}

export default function SimilarPhotosSheet({ photos, msalInstance, account, onClose, onDone }: Props) {
  // photos bevat de referentiefoto zelf; het aantal échte matches is dus één minder.
  const matchCount = Math.max(0, photos.length - 1)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  // Standaard zijn alle matches aangevinkt (niet de referentie), zodat je gericht
  // kunt deselecteren wat je wilt houden.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(photos.slice(1).map(p => p.id)))
  const busy = progress !== null

  const selectedCount = selected.size
  const allSelected = selectedCount === photos.length

  const toggle = (id: string) => setSelected(prev => {
    const s = new Set(prev)
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  })

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(photos.map(p => p.id)))

  // Verwerk de geselecteerde foto's met maximaal 5 parallelle workers.
  const runBulk = async (action: (photo: DriveItem) => Promise<void>) => {
    const targets = photos.filter(p => selected.has(p.id))
    if (targets.length === 0) return
    setProgress({ done: 0, total: targets.length })
    const queue = [...targets]
    let done = 0
    const worker = async () => {
      while (true) {
        const photo = queue.shift()
        if (!photo) break
        try { await action(photo) } catch { /* skip mislukte items */ }
        done++
        setProgress(p => p ? { ...p, done } : null)
      }
    }
    await Promise.all(Array.from({ length: 5 }, worker))
    setProgress(null)
    onDone(targets.map(p => p.id))
  }

  const handleDeleteSelected = () => runBulk(photo => deleteItem(msalInstance, account, photo.id))

  const handleMoveSelected = (targetFolder: DriveItem) => {
    setShowFolderPicker(false)
    return runBulk(photo => moveItem(msalInstance, account, photo.id, targetFolder.id))
  }

  const progressPct = progress ? (progress.total > 0 ? (progress.done / progress.total) * 100 : 0) : 0

  // Escape sluit de sheet, behalve tijdens een lopende actie
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div aria-hidden="true" className="flex-1 bg-black/50 animate-fade" onClick={busy ? undefined : onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="similar-title"
        className="flex flex-col rounded-t-3xl pb-safe animate-sheet"
        style={{ height: '70vh', background: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <span id="similar-title" className="font-semibold text-fluent-text-primary">
              {matchCount} vergelijkbare foto{matchCount !== 1 ? "'s" : ''}
            </span>
            <span className="text-xs text-fluent-text-secondary">· {selectedCount} geselecteerd</span>
            <button
              onClick={toggleAll}
              disabled={busy}
              className="text-xs text-fluent-accent hover:text-fluent-accent-hover disabled:opacity-40 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent"
            >
              {allSelected ? 'Niets' : 'Alles'}
            </button>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-fluent-text-secondary p-1 disabled:opacity-40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent"
            aria-label="Sluiten"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showFolderPicker ? (
          /* Mapkeuze voor "Verplaats alles" */
          <div className="flex-1 overflow-auto min-h-0">
            <div
              className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setShowFolderPicker(false)}
                className="flex items-center gap-1 text-fluent-text-secondary hover:text-fluent-text-primary text-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Terug
              </button>
              <span className="text-sm font-semibold text-fluent-text-primary">Verplaatsen naar…</span>
            </div>
            <FolderSidebar
              msalInstance={msalInstance}
              account={account}
              onMove={(folder) => handleMoveSelected(folder)}
              disabled={busy}
            />
          </div>
        ) : (
          /* Grid van thumbnails */
          <div className="flex-1 overflow-auto min-h-0 p-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo, i) => {
                const thumb = photo.thumbnails?.[0]?.medium?.url
                const isReference = i === 0
                const isSelected = selected.has(photo.id)
                return (
                  <button
                    key={photo.id}
                    onClick={() => !busy && toggle(photo.id)}
                    disabled={busy}
                    aria-pressed={isSelected}
                    aria-label={isReference ? `${photo.name} (referentie)` : photo.name}
                    className="relative aspect-square overflow-hidden flex items-center justify-center rounded-lg active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent focus-visible:ring-offset-1 focus-visible:ring-offset-fluent-bg-primary"
                    style={{
                      background: '#111116',
                      border: isSelected
                        ? '2px solid var(--color-danger)'
                        : isReference ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    }}
                  >
                    {thumb
                      ? <img src={thumb} alt="" className={`w-full h-full object-cover transition-opacity ${isSelected ? '' : 'opacity-60'}`} draggable={false} />
                      : <span className="text-fluent-text-secondary text-[10px] px-1 text-center truncate">{photo.name}</span>
                    }
                    {/* Selectievinkje */}
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: isSelected ? 'var(--color-danger)' : 'rgba(0,0,0,0.45)',
                        border: '1.5px solid white',
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {isReference && (
                      <span aria-hidden="true" className="absolute bottom-1 left-1 text-[9px] font-semibold text-white px-1 rounded-lg" style={{ background: 'var(--color-accent)' }}>
                        referentie
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Voortgangsbalk — alleen tijdens een actie */}
        {progress && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-label="Bezig"
            className="flex-shrink-0 px-4 py-2"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-fluent-text-secondary">Bezig…</span>
              <span className="text-xs text-fluent-text-secondary tabular-nums">{progress.done} / {progress.total}</span>
            </div>
            <div className="h-[4px]" style={{ background: 'rgba(127,127,127,0.2)' }}>
              <div className="h-full transition-all duration-200" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
            </div>
          </div>
        )}

        {/* Actieknoppen */}
        {!showFolderPicker && (
          <div
            className="flex-shrink-0 flex gap-2 px-4 py-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <Button
              variant="destructive"
              className="flex-1 min-w-0"
              onClick={handleDeleteSelected}
              disabled={busy || selectedCount === 0}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              <span className="truncate">Verwijder ({selectedCount})</span>
            </Button>
            <Button
              variant="primary"
              className="flex-1 min-w-0"
              onClick={() => setShowFolderPicker(true)}
              disabled={busy || selectedCount === 0}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              }
            >
              <span className="truncate">Verplaats ({selectedCount})</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
