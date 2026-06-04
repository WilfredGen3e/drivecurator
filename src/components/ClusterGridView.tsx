import { useState, useRef } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, moveItem } from '../services/graphService'
import { PhotoCluster } from '../services/clusterService'
import FolderSidebar, { Crumb } from './FolderSidebar'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  cluster: PhotoCluster
  onDone: (remaining: DriveItem[]) => void
  onTriage: () => void
}

export default function ClusterGridView({ msalInstance, account, cluster, onDone, onTriage }: Props) {
  const [photos] = useState<DriveItem[]>(cluster.photos)
  const [showSheet, setShowSheet] = useState(false)
  const [lastBreadcrumb, setLastBreadcrumb] = useState<Crumb[]>([])
  const [moveProgress, setMoveProgress] = useState<{ done: number; total: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const busy = moveProgress !== null

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const handleBulkMove = async (targetFolder: DriveItem, breadcrumb: Crumb[]) => {
    setShowSheet(false)
    setLastBreadcrumb(breadcrumb)
    setMoveProgress({ done: 0, total: photos.length })

    const queue = [...photos]
    let done = 0
    const worker = async () => {
      while (true) {
        const photo = queue.shift()
        if (!photo) break
        try { await moveItem(msalInstance, account, photo.id, targetFolder.id) } catch { /* skip */ }
        done++
        setMoveProgress(p => p ? { ...p, done } : null)
      }
    }
    await Promise.all(Array.from({ length: 5 }, worker))
    setMoveProgress(null)
    showToast(`Verplaatst naar "${targetFolder.name}"`)
    setTimeout(() => onDone([]), 1200)
  }

  return (
    <div className="h-full flex flex-col bg-fluent-bg-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0">
        <button
          onClick={() => onDone(photos)}
          className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug
        </button>
        <span className="text-fluent-text-disabled text-sm">·</span>
        <span className="text-sm font-semibold text-fluent-text-primary truncate flex-1">{cluster.label}</span>
        <span className="text-xs text-fluent-text-disabled flex-shrink-0">{photos.length} foto{photos.length !== 1 ? "'s" : ''}</span>
      </div>


      {/* Voortgangsbalk tijdens verplaatsen */}
      {moveProgress && (
        <div className="flex-shrink-0 px-4 py-3 bg-fluent-bg-primary border-b border-fluent-border space-y-1.5">
          <p className="text-sm text-fluent-text-secondary">Verplaatsen… {moveProgress.done} / {moveProgress.total}</p>
          <div className="h-1 bg-fluent-border">
            <div
              className="h-full bg-fluent-accent transition-all duration-200"
              style={{ width: `${(moveProgress.done / moveProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Thumbnail grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {photos.map(photo => {
            const thumb = photo.thumbnails?.[0]?.medium?.url
            return (
              <div key={photo.id} className="aspect-square bg-fluent-bg-hover overflow-hidden" style={{ borderRadius: 2 }}>
                {thumb
                  ? <img src={thumb} alt={photo.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center p-1">
                      <span className="text-fluent-text-disabled text-xs text-center leading-tight truncate">{photo.name}</span>
                    </div>
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Actiebalk */}
      {!moveProgress && (
        <div className="flex-shrink-0 bg-fluent-bg-primary border-t border-fluent-border px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setShowSheet(true)}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 bg-fluent-accent hover:bg-fluent-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ borderRadius: 2 }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            Verplaatsen naar…
          </button>
          <button
            onClick={onTriage}
            disabled={busy}
            className="px-4 py-2 text-sm text-fluent-text-secondary border border-fluent-border-strong hover:bg-fluent-bg-hover transition-colors disabled:opacity-40"
            style={{ borderRadius: 2 }}
          >
            Foto voor foto bekijken
          </button>
        </div>
      )}

      {/* Folder sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="flex-1 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="bg-white flex flex-col" style={{ height: '60vh', borderRadius: '12px 12px 0 0' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-fluent-border flex-shrink-0">
              <div className="min-w-0">
                <p className="font-semibold text-fluent-text-primary text-sm">Verplaatsen naar</p>
                <p className="text-fluent-text-secondary text-xs truncate">{cluster.label} · {photos.length} foto{photos.length !== 1 ? "'s" : ''}</p>
              </div>
              <button onClick={() => setShowSheet(false)} className="text-fluent-text-secondary p-1 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <FolderSidebar
                key={lastBreadcrumb.map(c => c.id).join('/')}
                msalInstance={msalInstance}
                account={account}
                onMove={(f, bc) => handleBulkMove(f, bc)}
                disabled={false}
                initialBreadcrumb={lastBreadcrumb}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-fluent-text-primary text-white text-sm px-4 py-2 z-50" style={{ borderRadius: 2 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
