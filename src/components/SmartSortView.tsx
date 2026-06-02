import { useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getFolderContents, moveItem } from '../services/graphService'
import { PhotoCluster, clusterPhotos, geocodeClusters } from '../services/clusterService'
import FolderBrowser from './FolderBrowser'
import FolderSidebar, { Crumb } from './FolderSidebar'
import ClusterTriageView from './ClusterTriageView'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onBack: () => void
}

type Phase =
  | { name: 'browse' }
  | { name: 'analyzing'; photoCount: number; geoStep: number; geoTotal: number }
  | { name: 'clusters'; folder: { id: string; name: string }; clusters: PhotoCluster[] }
  | { name: 'triage'; folder: { id: string; name: string }; clusters: PhotoCluster[]; clusterId: string }

function formatDateRange(start?: Date, end?: Date): string {
  if (!start || !end) return ''
  if (start.getTime() === end.getTime()) {
    return start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (start.getFullYear() !== end.getFullYear()) {
    return (
      start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' – ' +
      end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    )
  }
  if (start.getMonth() !== end.getMonth()) {
    return (
      start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
      ' – ' +
      end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
    )
  }
  return (
    start.getDate() +
    ' – ' +
    end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  )
}

export default function SmartSortView({ msalInstance, account, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'browse' })
  const [activeSheet, setActiveSheet] = useState<PhotoCluster | null>(null)
  const [moveProgress, setMoveProgress] = useState<{ clusterId: string; done: number; total: number } | null>(null)
  const [lastBreadcrumb, setLastBreadcrumb] = useState<Crumb[]>([])

  const busy = moveProgress !== null

  const handleFolderSelected = async (folder: { id: string; name: string }) => {
    setPhase({ name: 'analyzing', photoCount: 0, geoStep: 0, geoTotal: 0 })
    const allPhotos: DriveItem[] = []

    try {
      await getFolderContents(msalInstance, account, folder.id, (page) => {
        allPhotos.push(...page)
        setPhase(prev =>
          prev.name === 'analyzing' ? { ...prev, photoCount: allPhotos.length } : prev,
        )
      })

      const rawClusters = clusterPhotos(allPhotos)
      const locationCount = rawClusters.filter(c => c.type === 'location').length

      setPhase(prev =>
        prev.name === 'analyzing' ? { ...prev, geoTotal: locationCount } : prev,
      )

      const geocoded = await geocodeClusters(rawClusters, (done, total) => {
        setPhase(prev =>
          prev.name === 'analyzing' ? { ...prev, geoStep: done, geoTotal: total } : prev,
        )
      })

      setPhase({ name: 'clusters', folder, clusters: geocoded })
    } catch {
      setPhase({ name: 'browse' })
    }
  }

  const handleMove = async (cluster: PhotoCluster, targetFolder: DriveItem, breadcrumb: Crumb[]) => {
    setActiveSheet(null)
    setLastBreadcrumb(breadcrumb)
    setMoveProgress({ clusterId: cluster.id, done: 0, total: cluster.photos.length })

    const queue = [...cluster.photos]
    let done = 0

    const worker = async () => {
      while (true) {
        const photo = queue.shift()
        if (!photo) break
        try {
          await moveItem(msalInstance, account, photo.id, targetFolder.id)
        } catch { /* sla mislukte items over */ }
        done++
        setMoveProgress(p => (p ? { ...p, done } : null))
      }
    }

    await Promise.all(Array.from({ length: 5 }, worker))
    setMoveProgress(null)

    setPhase(prev =>
      prev.name === 'clusters'
        ? { ...prev, clusters: prev.clusters.filter(c => c.id !== cluster.id) }
        : prev,
    )
  }

  const handleSkip = (clusterId: string) => {
    setPhase(prev =>
      prev.name === 'clusters'
        ? { ...prev, clusters: prev.clusters.filter(c => c.id !== clusterId) }
        : prev,
    )
  }

  // ── Browse fase ─────────────────────────────────────────────────────────────
  if (phase.name === 'browse') {
    return (
      <FolderBrowser
        msalInstance={msalInstance}
        account={account}
        onBack={onBack}
        onFolderSelected={handleFolderSelected}
      />
    )
  }

  // ── Analyseer fase ───────────────────────────────────────────────────────────
  if (phase.name === 'analyzing') {
    const { photoCount, geoStep, geoTotal } = phase
    const geocoding = geoTotal > 0

    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-10 h-10 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
        {!geocoding ? (
          <div className="space-y-1">
            <p className="font-semibold text-fluent-text-primary">Foto's analyseren…</p>
            <p className="text-fluent-text-secondary text-sm">{photoCount} foto's geladen</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-fluent-text-primary">Locaties ophalen…</p>
            <p className="text-fluent-text-secondary text-sm">{geoStep} van {geoTotal} gebieden</p>
            <div className="w-48 h-1 bg-fluent-border mx-auto">
              <div
                className="h-full bg-fluent-accent transition-all duration-300"
                style={{ width: `${geoTotal > 0 ? (geoStep / geoTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Triage subfase ───────────────────────────────────────────────────────────
  if (phase.name === 'triage') {
    const cluster = phase.clusters.find(c => c.id === phase.clusterId)!
    return (
      <ClusterTriageView
        msalInstance={msalInstance}
        account={account}
        clusterLabel={cluster.label}
        initialPhotos={cluster.photos}
        onDone={(remaining) => {
          const updatedClusters = remaining.length === 0
            ? phase.clusters.filter(c => c.id !== phase.clusterId)
            : phase.clusters.map(c =>
                c.id === phase.clusterId ? { ...c, photos: remaining } : c,
              )
          setPhase({ name: 'clusters', folder: phase.folder, clusters: updatedClusters })
        }}
      />
    )
  }

  // ── Clusters fase ────────────────────────────────────────────────────────────
  const { folder, clusters } = phase

  // Klaar scherm als alle clusters verwerkt zijn
  if (clusters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center">
        <svg className="w-12 h-12 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h2 className="text-xl font-semibold text-fluent-text-primary">Slim sorteren voltooid</h2>
          <p className="text-fluent-text-secondary text-sm mt-1">Alle pakketjes zijn verwerkt.</p>
        </div>
        <button
          onClick={onBack}
          className="bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold px-6 py-2 text-sm transition-colors"
          style={{ borderRadius: 2 }}
        >
          Terug naar begin
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0">
        <button
          onClick={onBack}
          className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug
        </button>
        <span className="text-fluent-text-disabled text-sm">·</span>
        <span className="text-sm text-fluent-text-secondary truncate">"{folder.name}"</span>
        <span className="ml-auto text-xs text-fluent-text-disabled flex-shrink-0">
          {clusters.length} pakket{clusters.length !== 1 ? 'jes' : ''}
        </span>
      </div>

      {/* Cluster lijst */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-fluent-bg-secondary">
        {clusters.map(cluster => {
          const isMoving = moveProgress?.clusterId === cluster.id
          const thumbs = cluster.photos.slice(0, 5).filter(p => p.thumbnails?.[0]?.medium?.url)
          const extraCount = Math.max(0, cluster.photos.length - thumbs.length)

          return (
            <div
              key={cluster.id}
              className="bg-fluent-bg-primary border border-fluent-border p-4 space-y-3"
              style={{ borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
            >
              {/* Titel */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <ClusterIcon type={cluster.type} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-fluent-text-primary text-sm leading-snug">
                    {cluster.label}
                  </p>
                  <p className="text-fluent-text-secondary text-xs mt-0.5">
                    {cluster.photos.length} foto{cluster.photos.length !== 1 ? "'s" : ''}
                    {cluster.startDate && cluster.endDate && (
                      <> · {formatDateRange(cluster.startDate, cluster.endDate)}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Thumbnails — klikbaar om cluster te triagen */}
              {thumbs.length > 0 && (
                <button
                  onClick={() => setPhase({ name: 'triage', folder, clusters, clusterId: cluster.id })}
                  disabled={busy}
                  className="flex items-center gap-1.5 group/thumbs disabled:pointer-events-none text-left"
                >
                  {thumbs.map(photo => (
                    <img
                      key={photo.id}
                      src={photo.thumbnails![0].medium!.url}
                      alt=""
                      className="w-14 h-14 object-cover flex-shrink-0 group-hover/thumbs:opacity-80 transition-opacity"
                      style={{ borderRadius: 2 }}
                    />
                  ))}
                  {extraCount > 0 && (
                    <span className="text-xs text-fluent-accent pl-1 underline underline-offset-2">
                      +{extraCount} meer
                    </span>
                  )}
                </button>
              )}

              {/* Voortgang tijdens verplaatsen */}
              {isMoving && moveProgress && (
                <div className="space-y-1">
                  <p className="text-xs text-fluent-text-secondary">
                    Verplaatsen… {moveProgress.done} / {moveProgress.total}
                  </p>
                  <div className="h-1 bg-fluent-border">
                    <div
                      className="h-full bg-fluent-accent transition-all duration-200"
                      style={{ width: `${(moveProgress.done / moveProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Knoppen */}
              {!isMoving && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSheet(cluster)}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-fluent-accent hover:bg-fluent-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-40"
                    style={{ borderRadius: 2 }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    Verplaatsen naar…
                  </button>
                  <button
                    onClick={() => handleSkip(cluster.id)}
                    disabled={busy}
                    className="px-3 py-1.5 text-sm text-fluent-text-secondary border border-fluent-border-strong hover:bg-fluent-bg-hover transition-colors disabled:opacity-40"
                    style={{ borderRadius: 2 }}
                  >
                    Overslaan
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Folder sheet */}
      {activeSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="flex-1 bg-black/40" onClick={() => setActiveSheet(null)} />
          <div className="bg-white flex flex-col" style={{ height: '60vh', borderRadius: '12px 12px 0 0' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-fluent-border flex-shrink-0">
              <div className="min-w-0">
                <p className="font-semibold text-fluent-text-primary text-sm">Verplaatsen naar</p>
                <p className="text-fluent-text-secondary text-xs truncate">{activeSheet.label}</p>
              </div>
              <button onClick={() => setActiveSheet(null)} className="text-fluent-text-secondary p-1 flex-shrink-0">
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
                onMove={(folder, breadcrumb) => handleMove(activeSheet, folder, breadcrumb)}
                disabled={false}
                initialBreadcrumb={lastBreadcrumb}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClusterIcon({ type }: { type: PhotoCluster['type'] }) {
  if (type === 'location') {
    return (
      <svg className="w-5 h-5 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  if (type === 'screenshots') {
    return (
      <svg className="w-5 h-5 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-fluent-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
