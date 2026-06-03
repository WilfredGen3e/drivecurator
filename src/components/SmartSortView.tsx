import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getFolderContents, moveItem } from '../services/graphService'
import { PhotoCluster, ClusterType } from '../services/clusterService'
import { AnalysisResult, analyzePhotos } from '../services/analysisService'
import FolderSidebar, { Crumb } from './FolderSidebar'
import ClusterTriageView from './ClusterTriageView'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  folder: { id: string; name: string }
  onBack: () => void
}

type Phase =
  | { name: 'initializing'; photoCount: number; geoStep: number; geoTotal: number }
  | { name: 'error'; message: string }
  | { name: 'dashboard' }
  | { name: 'category'; key: string; label: string; clusters: PhotoCluster[] }
  | { name: 'triage'; key: string; label: string; clusters: PhotoCluster[]; clusterId: string }

function formatDateRange(start?: Date, end?: Date): string {
  if (!start || !end) return ''
  if (start.getTime() === end.getTime())
    return start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  if (start.getFullYear() !== end.getFullYear())
    return `${start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`
  if (start.getMonth() !== end.getMonth())
    return `${start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`
  return `${start.getDate()} – ${end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

// Zet AnalysisResult-categorieën om naar PhotoCluster[]
function buildClusters(key: string, result: AnalysisResult): PhotoCluster[] {
  switch (key) {
    case 'location':
      return result.locationClusters
    case 'screenshots':
      return result.screenshots.length > 0
        ? [{ id: 'screenshots', type: 'screenshots' as ClusterType, photos: result.screenshots, label: 'Schermafbeeldingen' }]
        : []
    case 'whatsapp':
      return result.whatsapp.length > 0
        ? [{ id: 'whatsapp', type: 'whatsapp' as ClusterType, photos: result.whatsapp, label: 'WhatsApp & social media' }]
        : []
    case 'monthly':
      return result.monthlyGroups.map(g => ({
        id: g.id,
        type: 'monthly' as ClusterType,
        photos: g.photos,
        label: g.label,
        startDate: new Date(g.year, g.month - 1, 1),
        endDate: new Date(g.year, g.month, 0),
      }))
    case 'bursts':
      return result.burstSets.map((b, i) => {
        const lastPhoto = b.photos[b.photos.length - 1]
        const lastDateStr = lastPhoto?.photo?.takenDateTime ?? lastPhoto?.fileSystemInfo?.createdDateTime
        const endDate = lastDateStr ? new Date(lastDateStr) : b.startDate
        return {
          id: b.id,
          type: 'burst' as ClusterType,
          photos: b.photos,
          label: `Burst-reeks ${i + 1}: ${b.photos.length} foto's`,
          startDate: b.startDate,
          endDate,
        }
      })
    case 'duplicates':
      return result.duplicateSets.map(d => {
        const dt = d.photos[0]?.photo?.takenDateTime
        const date = dt ? new Date(dt) : undefined
        return {
          id: d.id,
          type: 'duplicate' as ClusterType,
          photos: d.photos,
          label: `Duplicaten: ${d.photos.length} foto's`,
          startDate: date,
          endDate: date,
        }
      })
    default:
      return []
  }
}

export default function SmartSortView({ msalInstance, account, folder, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'initializing', photoCount: 0, geoStep: 0, geoTotal: 0 })
  const [result, setResult] = useState<AnalysisResult | null>(null)

  // Verplaatsen state (voor cluster-kaarten bulk move)
  const [activeSheet, setActiveSheet] = useState<PhotoCluster | null>(null)
  const [moveProgress, setMoveProgress] = useState<{ clusterId: string; done: number; total: number } | null>(null)
  const [lastBreadcrumb, setLastBreadcrumb] = useState<Crumb[]>([])

  const busy = moveProgress !== null

  // ── Initialisatie ──────────────────────────────────────────────────────────
  useEffect(() => { startAnalysis() }, [])

  const startAnalysis = async () => {
    setPhase({ name: 'initializing', photoCount: 0, geoStep: 0, geoTotal: 0 })
    const allPhotos: DriveItem[] = []
    try {
      await getFolderContents(msalInstance, account, folder.id, (page) => {
        allPhotos.push(...page)
        setPhase(prev => prev.name === 'initializing' ? { ...prev, photoCount: allPhotos.length } : prev)
      })

      const analysisResult = await analyzePhotos(allPhotos, (done, total) => {
        setPhase(prev => prev.name === 'initializing' ? { ...prev, geoStep: done, geoTotal: total } : prev)
      })

      setResult(analysisResult)
      setPhase({ name: 'dashboard' })
    } catch (err) {
      console.error('[SmartSort] Analyse mislukt:', err)
      setPhase({ name: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  // ── Bulk move (cluster-kaarten) ────────────────────────────────────────────
  const handleBulkMove = async (cluster: PhotoCluster, targetFolder: DriveItem, breadcrumb: Crumb[]) => {
    setActiveSheet(null)
    setLastBreadcrumb(breadcrumb)
    setMoveProgress({ clusterId: cluster.id, done: 0, total: cluster.photos.length })

    const queue = [...cluster.photos]
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

    // Verwijder cluster uit de lijst
    setPhase(prev => {
      if (prev.name !== 'category') return prev
      const updated = prev.clusters.filter(c => c.id !== cluster.id)
      return { ...prev, clusters: updated }
    })
  }

  const handleSkip = (clusterId: string) => {
    setPhase(prev => prev.name === 'category'
      ? { ...prev, clusters: prev.clusters.filter(c => c.id !== clusterId) }
      : prev,
    )
  }

  // ── Initialisatie ──────────────────────────────────────────────────────────
  if (phase.name === 'initializing') {
    const { photoCount, geoStep, geoTotal } = phase
    const geocoding = geoTotal > 0

    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 px-6 text-center bg-fluent-bg-secondary">
        <div className="w-10 h-10 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
        {!geocoding ? (
          <div className="space-y-1">
            <p className="font-semibold text-fluent-text-primary">Foto's ophalen en analyseren…</p>
            <p className="text-fluent-text-secondary text-sm">{photoCount} foto's geladen</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-fluent-text-primary">Locaties ophalen…</p>
            <p className="text-fluent-text-secondary text-sm">{geoStep} van {geoTotal} gebieden</p>
            <div className="w-48 h-1 bg-fluent-border mx-auto">
              <div className="h-full bg-fluent-accent transition-all duration-300" style={{ width: `${geoTotal > 0 ? (geoStep / geoTotal) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Fout ──────────────────────────────────────────────────────────────────
  if (phase.name === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center bg-fluent-bg-secondary">
        <svg className="w-10 h-10 text-fluent-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p className="font-semibold text-fluent-text-primary">Analyse mislukt</p>
          <p className="text-fluent-text-secondary text-sm mt-1 max-w-sm">{phase.message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={startAnalysis}
            className="bg-fluent-accent hover:bg-fluent-accent-hover text-white px-5 py-2 text-sm font-semibold transition-colors"
            style={{ borderRadius: 2 }}
          >
            Opnieuw proberen
          </button>
          <button
            onClick={onBack}
            className="border border-fluent-border-strong text-fluent-text-secondary hover:bg-fluent-bg-hover px-5 py-2 text-sm transition-colors"
            style={{ borderRadius: 2 }}
          >
            Andere map kiezen
          </button>
        </div>
      </div>
    )
  }

  // ── Triage ─────────────────────────────────────────────────────────────────
  if (phase.name === 'triage') {
    const cluster = phase.clusters.find(c => c.id === phase.clusterId)!
    return (
      <ClusterTriageView
        msalInstance={msalInstance}
        account={account}
        clusterLabel={cluster.label}
        initialPhotos={cluster.photos}
        onDone={(remaining) => {
          const updated = remaining.length === 0
            ? phase.clusters.filter(c => c.id !== phase.clusterId)
            : phase.clusters.map(c => c.id === phase.clusterId ? { ...c, photos: remaining } : c)
          setPhase({ name: 'category', key: phase.key, label: phase.label, clusters: updated })
        }}
      />
    )
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (phase.name === 'dashboard' && result) {
    const totalLocationPhotos = result.locationClusters.reduce((s, c) => s + c.photos.length, 0)
    const totalMonthlyPhotos = result.monthlyGroups.reduce((s, g) => s + g.photos.length, 0)

    const categories = [
      {
        key: 'location',
        label: 'Op locatie',
        description: 'Vakanties en reizen gegroepeerd op GPS en datum',
        stat: `${result.locationClusters.length} clusters · ${totalLocationPhotos} foto's`,
        count: totalLocationPhotos,
        available: true,
        icon: <LocationIcon />,
      },
      {
        key: 'screenshots',
        label: 'Schermafbeeldingen',
        description: 'Herkend op bestandsnaam en bestandstype',
        stat: `${result.screenshots.length} foto's`,
        count: result.screenshots.length,
        available: true,
        icon: <ScreenshotIcon />,
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp & social media',
        description: 'Herkend op bestandsnaam (WA, Instagram, Snapchat…)',
        stat: `${result.whatsapp.length} foto's`,
        count: result.whatsapp.length,
        available: true,
        icon: <ChatIcon />,
      },
      {
        key: 'monthly',
        label: 'Maandelijkse foto\'s',
        description: 'Camera-foto\'s zonder locatie, per maand gegroepeerd',
        stat: `${result.monthlyGroups.length} maanden · ${totalMonthlyPhotos} foto's`,
        count: totalMonthlyPhotos,
        available: true,
        icon: <CalendarIcon />,
      },
      {
        key: 'bursts',
        label: 'Burst-reeksen',
        description: '3+ foto\'s binnen 3 seconden van dezelfde camera',
        stat: `${result.burstSets.length} reeksen · ${result.burstSets.reduce((s, b) => s + b.photos.length, 0)} foto's`,
        count: result.burstSets.length,
        available: true,
        icon: <BurstIcon />,
      },
      {
        key: 'duplicates',
        label: 'Mogelijke duplicaten',
        description: 'Foto\'s met exact dezelfde opnamedatum en -tijd',
        stat: `${result.duplicateSets.length} sets · ${result.duplicateSets.reduce((s, d) => s + d.photos.length, 0)} foto's`,
        count: result.duplicateSets.length,
        available: true,
        icon: <DuplicateIcon />,
      },
    ]

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-10 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0">
          <button onClick={onBack} className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Terug
          </button>
          <span className="text-fluent-text-disabled text-sm">·</span>
          <span className="text-sm text-fluent-text-secondary truncate">"{folder.name}"</span>
          <span className="ml-auto text-xs text-fluent-text-disabled flex-shrink-0">{result.totalPhotos} foto's geanalyseerd</span>
        </div>

        {/* Categorie-rijen */}
        <div className="flex-1 overflow-y-auto bg-fluent-bg-secondary">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
            <p className="text-xs font-semibold text-fluent-text-secondary uppercase tracking-wider px-1 pb-1">Kies een categorie</p>
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => {
                  if (!cat.available) return
                  const clusters = buildClusters(cat.key, result)
                  setPhase({ name: 'category', key: cat.key, label: cat.label, clusters })
                }}
                disabled={!cat.available}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left bg-fluent-bg-primary border transition-colors ${
                  cat.available && cat.count > 0
                    ? 'border-fluent-border hover:border-fluent-accent hover:bg-fluent-accent-light group cursor-pointer'
                    : 'border-fluent-border opacity-50 cursor-default'
                }`}
                style={{ borderRadius: 2 }}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 ${cat.count > 0 ? 'text-fluent-accent' : 'text-fluent-text-disabled'}`}>
                  {cat.icon}
                </div>

                {/* Tekst */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${cat.count > 0 ? 'text-fluent-text-primary group-hover:text-fluent-accent transition-colors' : 'text-fluent-text-secondary'}`}>
                      {cat.label}
                    </span>
                    {!cat.available && (
                      <span className="text-xs bg-fluent-bg-hover text-fluent-text-secondary px-1.5 py-0.5 flex-shrink-0" style={{ borderRadius: 2 }}>
                        Binnenkort
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fluent-text-secondary mt-0.5">{cat.description}</p>
                </div>

                {/* Teller + pijl */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span className={`text-sm font-semibold tabular-nums ${cat.count > 0 ? 'text-fluent-accent' : 'text-fluent-text-disabled'}`}>
                    {cat.stat}
                  </span>
                  {cat.available && cat.count > 0 && (
                    <svg className="w-4 h-4 text-fluent-text-disabled group-hover:text-fluent-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Categorie-clusters ─────────────────────────────────────────────────────
  const { key: categoryKey, label: categoryLabel, clusters } = phase as Extract<Phase, { name: 'category' }>

  if (clusters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center">
        <svg className="w-12 h-12 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h2 className="text-xl font-semibold text-fluent-text-primary">Alles verwerkt</h2>
          <p className="text-fluent-text-secondary text-sm mt-1">Alle pakketjes in "{categoryLabel}" zijn verwerkt.</p>
        </div>
        <button onClick={() => setPhase({ name: 'dashboard' })} className="bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold px-6 py-2 text-sm transition-colors" style={{ borderRadius: 2 }}>
          Terug naar overzicht
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0">
        <button onClick={() => setPhase({ name: 'dashboard' })} className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Terug
        </button>
        <span className="text-fluent-text-disabled text-sm">·</span>
        <span className="text-sm font-semibold text-fluent-text-primary truncate">{categoryLabel}</span>
        <span className="ml-auto text-xs text-fluent-text-disabled flex-shrink-0">{clusters.length} pakket{clusters.length !== 1 ? 'jes' : ''}</span>
      </div>

      {/* Cluster lijst */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-fluent-bg-secondary">
        {clusters.map(cluster => {
          const isMoving = moveProgress?.clusterId === cluster.id
          const thumbs = cluster.photos.slice(0, 5).filter(p => p.thumbnails?.[0]?.medium?.url)
          const extraCount = Math.max(0, cluster.photos.length - thumbs.length)

          return (
            <div key={cluster.id} className="bg-fluent-bg-primary border border-fluent-border p-4 space-y-3" style={{ borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              {/* Titel */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5"><ClusterIcon type={cluster.type} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-fluent-text-primary text-sm leading-snug">{cluster.label}</p>
                  <p className="text-fluent-text-secondary text-xs mt-0.5">
                    {cluster.photos.length} foto{cluster.photos.length !== 1 ? "'s" : ''}
                    {cluster.startDate && cluster.endDate && <> · {formatDateRange(cluster.startDate, cluster.endDate)}</>}
                  </p>
                </div>
              </div>

              {/* Thumbnails */}
              {thumbs.length > 0 && (
                <button
                  onClick={() => setPhase({ name: 'triage', key: categoryKey, label: categoryLabel, clusters, clusterId: cluster.id })}
                  disabled={busy}
                  className="flex items-center gap-1.5 group/thumbs disabled:pointer-events-none text-left"
                >
                  {thumbs.map(photo => (
                    <img key={photo.id} src={photo.thumbnails![0].medium!.url} alt="" className="w-14 h-14 object-cover flex-shrink-0 group-hover/thumbs:opacity-80 transition-opacity" style={{ borderRadius: 2 }} />
                  ))}
                  {extraCount > 0 && (
                    <span className="text-xs text-fluent-accent pl-1 underline underline-offset-2">+{extraCount} meer</span>
                  )}
                </button>
              )}

              {/* Voortgang tijdens verplaatsen */}
              {isMoving && moveProgress && (
                <div className="space-y-1">
                  <p className="text-xs text-fluent-text-secondary">Verplaatsen… {moveProgress.done} / {moveProgress.total}</p>
                  <div className="h-1 bg-fluent-border">
                    <div className="h-full bg-fluent-accent transition-all duration-200" style={{ width: `${(moveProgress.done / moveProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Knoppen */}
              {!isMoving && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveSheet(cluster)} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 bg-fluent-accent hover:bg-fluent-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-40" style={{ borderRadius: 2 }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                    Verplaatsen naar…
                  </button>
                  <button onClick={() => handleSkip(cluster.id)} disabled={busy} className="px-3 py-1.5 text-sm text-fluent-text-secondary border border-fluent-border-strong hover:bg-fluent-bg-hover transition-colors disabled:opacity-40" style={{ borderRadius: 2 }}>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <FolderSidebar key={lastBreadcrumb.map(c => c.id).join('/')} msalInstance={msalInstance} account={account} onMove={(f, bc) => handleBulkMove(activeSheet, f, bc)} disabled={false} initialBreadcrumb={lastBreadcrumb} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ClusterIcon({ type }: { type: ClusterType }) {
  if (type === 'location')    return <svg className="w-5 h-5 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  if (type === 'screenshots') return <svg className="w-5 h-5 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  if (type === 'whatsapp')    return <svg className="w-5 h-5 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  if (type === 'monthly')     return <svg className="w-5 h-5 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  if (type === 'burst')       return <svg className="w-5 h-5 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  if (type === 'duplicate')   return <svg className="w-5 h-5 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
  return <svg className="w-5 h-5 text-fluent-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}

function LocationIcon()   { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function ScreenshotIcon() { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> }
function ChatIcon()       { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> }
function CalendarIcon()   { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
function BurstIcon()      { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> }
function DuplicateIcon()  { return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> }
