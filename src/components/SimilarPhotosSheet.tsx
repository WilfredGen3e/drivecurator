import { useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem } from '../services/graphService'
import FolderSidebar from './FolderSidebar'

interface Props {
  // photos[0] is altijd de referentiefoto; de rest zijn de gevonden matches.
  photos: DriveItem[]
  // Aantal foto's dat de scan heeft doorzocht — getoond in de lege-staat.
  scannedCount: number
  // Gevoeligheidsdrempels + "opnieuw zoeken", zodat de gebruiker vanuit dit
  // scherm kan bijstellen en herzoeken zonder het eerst te sluiten.
  thresholdHash: number
  setThresholdHash: (v: number) => void
  thresholdColor: number
  setThresholdColor: (v: number) => void
  onResearch: () => void
  msalInstance: PublicClientApplication
  account: AccountInfo
  onClose: () => void
  onDone: (processedIds: string[]) => void
}

export default function SimilarPhotosSheet({
  photos, scannedCount,
  thresholdHash, setThresholdHash, thresholdColor, setThresholdColor, onResearch,
  msalInstance, account, onClose, onDone,
}: Props) {
  // photos bevat de referentiefoto zelf; het aantal échte matches is dus één minder.
  const matchCount = Math.max(0, photos.length - 1)
  const isEmpty = matchCount === 0
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const busy = progress !== null

  // Verwerk alle foto's met maximaal 5 parallelle workers (zelfde patroon als
  // de bulk move in SmartSortView).
  const runBulk = async (action: (photo: DriveItem) => Promise<void>) => {
    setProgress({ done: 0, total: photos.length })
    const queue = [...photos]
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
    onDone(photos.map(p => p.id))
  }

  const handleDeleteAll = () => runBulk(photo => deleteItem(msalInstance, account, photo.id))

  const handleMoveAll = (targetFolder: DriveItem) => {
    setShowFolderPicker(false)
    return runBulk(photo => moveItem(msalInstance, account, photo.id, targetFolder.id))
  }

  const progressPct = progress ? (progress.total > 0 ? (progress.done / progress.total) * 100 : 0) : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1 bg-black/50" onClick={busy ? undefined : onClose} />

      <div
        className="flex flex-col"
        style={{ height: '70vh', borderRadius: '12px 12px 0 0', background: 'var(--color-bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="font-semibold text-fluent-text-primary">
            {isEmpty
              ? 'Geen vergelijkbare gevonden'
              : `${matchCount} vergelijkbare foto${matchCount !== 1 ? "'s" : ''} gevonden`}
          </span>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-fluent-text-secondary p-1 disabled:opacity-40"
            title="Sluiten"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="flex items-center gap-1 text-fluent-text-secondary hover:text-fluent-text-primary text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Terug
              </button>
              <span className="text-sm font-semibold text-fluent-text-primary">Verplaatsen naar…</span>
            </div>
            <FolderSidebar
              msalInstance={msalInstance}
              account={account}
              onMove={(folder) => handleMoveAll(folder)}
              disabled={busy}
            />
          </div>
        ) : isEmpty ? (
          /* Lege-staat — scan klaar, maar niets gevonden */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <svg className="w-10 h-10 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <p className="font-semibold text-fluent-text-primary">Geen vergelijkbare foto's gevonden</p>
            <p className="text-sm text-fluent-text-secondary">
              {scannedCount} foto{scannedCount !== 1 ? "'s" : ''} doorzocht. Stel de gevoeligheid ruimer in en zoek opnieuw.
            </p>

            {/* Gevoeligheid bijstellen + direct opnieuw zoeken */}
            <div className="w-full max-w-sm mt-2 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-xs text-fluent-text-secondary">
                <span className="w-10 text-right">Vorm</span>
                <span className="text-fluent-text-disabled">Strikt</span>
                <input
                  type="range" min={2} max={24} step={1} value={thresholdHash}
                  onChange={e => setThresholdHash(+e.target.value)}
                  className="flex-1 accent-fluent-accent"
                />
                <span className="text-fluent-text-disabled">Ruim</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-fluent-text-secondary">
                <span className="w-10 text-right">Kleur</span>
                <span className="text-fluent-text-disabled">Ruim</span>
                <input
                  type="range" min={0.5} max={0.99} step={0.01} value={thresholdColor}
                  onChange={e => setThresholdColor(+e.target.value)}
                  className="flex-1 accent-fluent-accent"
                />
                <span className="text-fluent-text-disabled">Strikt</span>
              </label>
              <button
                onClick={onResearch}
                className="mt-1 self-center flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-fluent-accent hover:bg-fluent-accent-hover transition-colors"
                style={{ borderRadius: 2 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
                Opnieuw zoeken
              </button>
            </div>
          </div>
        ) : (
          /* Grid van thumbnails */
          <div className="flex-1 overflow-auto min-h-0 p-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo, i) => {
                const thumb = photo.thumbnails?.[0]?.medium?.url
                const isReference = i === 0
                return (
                  <div
                    key={photo.id}
                    className="aspect-square overflow-hidden flex items-center justify-center"
                    style={{
                      background: '#111116',
                      borderRadius: 2,
                      border: isReference ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    }}
                    title={isReference ? `${photo.name} (referentie)` : photo.name}
                  >
                    {thumb
                      ? <img src={thumb} alt={photo.name} className="w-full h-full object-cover" draggable={false} />
                      : <span className="text-fluent-text-secondary text-[10px] px-1 text-center truncate">{photo.name}</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Voortgangsbalk — alleen tijdens een actie */}
        {progress && (
          <div className="flex-shrink-0 px-4 py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-fluent-text-secondary">Bezig…</span>
              <span className="text-xs text-fluent-text-secondary tabular-nums">{progress.done} / {progress.total}</span>
            </div>
            <div className="h-[4px]" style={{ background: 'rgba(127,127,127,0.2)' }}>
              <div className="h-full transition-all duration-200" style={{ width: `${progressPct}%`, background: 'var(--color-accent)' }} />
            </div>
          </div>
        )}

        {/* Actieknoppen — verborgen in de lege-staat */}
        {!showFolderPicker && !isEmpty && (
          <div
            className="flex-shrink-0 flex gap-2 px-4 py-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={handleDeleteAll}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-fluent-danger hover:bg-red-700 disabled:opacity-40 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Verwijder alles
            </button>
            <button
              onClick={() => setShowFolderPicker(true)}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-fluent-accent hover:bg-fluent-accent-hover disabled:opacity-40 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              Verplaats alles naar…
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
