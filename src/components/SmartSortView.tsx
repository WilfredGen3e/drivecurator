import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getFolderContents, moveItem } from '../services/graphService'
import { PhotoCluster, ClusterType } from '../services/clusterService'
import { AnalysisResult, analyzePhotos } from '../services/analysisService'
import FolderSidebar, { Crumb } from './FolderSidebar'
import ClusterTriageView from './ClusterTriageView'
import ClusterGridView from './ClusterGridView'
import { getPhotoDate } from '../services/clusterService'
import Button from './ui/Button'
// import { findEventForCluster } from '../services/eventService'  // IJskast: zie eventService.ts

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  folder: { id: string; name: string }
  initialPhotos?: DriveItem[]
  cachedResult?: AnalysisResult | null
  onResult?: (result: AnalysisResult) => void
  onBack: () => void
}

type Phase =
  | { name: 'initializing'; photoCount: number; geoStep: number; geoTotal: number }
  | { name: 'error'; message: string }
  | { name: 'dashboard' }
  | { name: 'category'; key: string; label: string; clusters: PhotoCluster[] }
  | { name: 'grid'; key: string; label: string; clusters: PhotoCluster[]; clusterId: string }
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

const MONTH_NAMES_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']

function splitByMonth(photos: DriveItem[], type: ClusterType): PhotoCluster[] {
  const map = new Map<string, DriveItem[]>()
  for (const photo of photos) {
    const d = getPhotoDate(photo)
    const key = d ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}` : 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(photo)
  }
  return Array.from(map.entries())
    .map(([key, groupPhotos]) => {
      if (key === 'unknown') return { id: `${type}-unknown`, type, photos: groupPhotos, label: 'Onbekende datum' }
      const [year, monthStr] = key.split('-')
      const monthIndex = parseInt(monthStr)
      return {
        id: `${type}-${key}`,
        type,
        photos: groupPhotos,
        label: `${MONTH_NAMES_NL[monthIndex]} ${year}`,
        startDate: new Date(parseInt(year), monthIndex, 1),
        endDate: new Date(parseInt(year), monthIndex + 1, 0),
      }
    })
    .sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0))
}

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
    case 'other-camera':
      return result.otherCameraGroups.map(g => ({
        id: g.id,
        type: 'other-camera' as ClusterType,
        photos: g.photos,
        label: g.cameraMake,
      }))
    case 'potential-junk':
      return splitByMonth(result.potentialJunk, 'potential-junk')
    default:
      return []
  }
}

// Kleur per categorie
const CATEGORY_COLORS: Record<string, { iconBg: string; iconColor: string; accentBorder: string }> = {
  'location':       { iconBg: 'rgba(59,130,246,0.12)',  iconColor: '#60a5fa', accentBorder: 'rgba(59,130,246,0.4)' },
  'screenshots':    { iconBg: 'rgba(100,116,139,0.12)', iconColor: '#94a3b8', accentBorder: 'rgba(100,116,139,0.4)' },
  'whatsapp':       { iconBg: 'rgba(34,197,94,0.12)',   iconColor: '#4ade80', accentBorder: 'rgba(34,197,94,0.4)' },
  'monthly':        { iconBg: 'rgba(249,115,22,0.12)',  iconColor: '#fb923c', accentBorder: 'rgba(249,115,22,0.4)' },
  'bursts':         { iconBg: 'rgba(234,179,8,0.12)',   iconColor: '#facc15', accentBorder: 'rgba(234,179,8,0.4)' },
  'duplicates':     { iconBg: 'rgba(239,68,68,0.12)',   iconColor: '#f87171', accentBorder: 'rgba(239,68,68,0.4)' },
  'potential-junk': { iconBg: 'rgba(107,114,128,0.12)', iconColor: '#9ca3af', accentBorder: 'rgba(107,114,128,0.4)' },
  'other-camera':   { iconBg: 'rgba(139,92,246,0.12)',  iconColor: '#a78bfa', accentBorder: 'rgba(139,92,246,0.4)' },
}

export default function SmartSortView({ msalInstance, account, folder, initialPhotos, cachedResult, onResult, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'initializing', photoCount: 0, geoStep: 0, geoTotal: 0 })
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const [activeSheet, setActiveSheet] = useState<PhotoCluster | null>(null)
  const [moveProgress, setMoveProgress] = useState<{ clusterId: string; done: number; total: number } | null>(null)
  const [lastBreadcrumb, setLastBreadcrumb] = useState<Crumb[]>([])

  const busy = moveProgress !== null

  useEffect(() => { startAnalysis() }, [])

  const startAnalysis = async () => {
    if (cachedResult) {
      setResult(cachedResult)
      setPhase({ name: 'dashboard' })
      return
    }
    setPhase({ name: 'initializing', photoCount: 0, geoStep: 0, geoTotal: 0 })

    let allPhotos: DriveItem[]
    if (initialPhotos && initialPhotos.length > 0) {
      allPhotos = initialPhotos
      setPhase(prev => prev.name === 'initializing' ? { ...prev, photoCount: allPhotos.length } : prev)
    } else {
      allPhotos = []
      try {
        await getFolderContents(msalInstance, account, folder.id, (page) => {
          allPhotos.push(...page)
          setPhase(prev => prev.name === 'initializing' ? { ...prev, photoCount: allPhotos.length } : prev)
        })
      } catch (err) {
        console.error("[SmartSort] Foto's ophalen mislukt:", err)
        setPhase({ name: 'error', message: err instanceof Error ? err.message : String(err) })
        return
      }
    }

    try {
      const analysisResult = await analyzePhotos(allPhotos, (done, total) => {
        setPhase(prev => prev.name === 'initializing' ? { ...prev, geoStep: done, geoTotal: total } : prev)
      })
      setResult(analysisResult)
      onResult?.(analysisResult)
      setPhase({ name: 'dashboard' })
    } catch (err) {
      console.error('[SmartSort] Analyse mislukt:', err)
      setPhase({ name: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

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

  // ── Initialisatie ────────────────────────────────────────────────────────────
  if (phase.name === 'initializing') {
    const { photoCount, geoStep, geoTotal } = phase
    const geocoding = geoTotal > 0

    return (
      <div className="h-full flex flex-col items-center justify-center gap-8 px-6 text-center bg-fluent-bg-secondary">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-fluent-border" />
          <div className="absolute inset-0 rounded-full border-2 border-t-fluent-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 flex items-center justify-center">
            <svg className="w-6 h-6 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>

        {!geocoding ? (
          <div className="space-y-1">
            <p className="font-semibold text-fluent-text-primary">Foto's ophalen en analyseren…</p>
            <p className="text-fluent-text-secondary text-sm tabular-nums">
              {photoCount > 0 ? `${photoCount} foto's geladen` : 'Bezig met laden…'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 w-56">
            <div>
              <p className="font-semibold text-fluent-text-primary">Locaties ophalen…</p>
              <p className="text-fluent-text-secondary text-sm mt-1 tabular-nums">
                {geoStep} van {geoTotal} gebieden
              </p>
            </div>
            <div className="h-[3px] rounded-full bg-fluent-border overflow-hidden">
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

  // ── Fout ─────────────────────────────────────────────────────────────────────
  if (phase.name === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center bg-fluent-bg-secondary">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <svg className="w-7 h-7 text-fluent-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-fluent-text-primary">Analyse mislukt</p>
          <p className="text-fluent-text-secondary text-sm mt-1 max-w-sm">{phase.message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={startAnalysis}>Opnieuw proberen</Button>
          <Button variant="neutral" onClick={onBack}>Andere map kiezen</Button>
        </div>
      </div>
    )
  }

  // ── Gedeelde helper ───────────────────────────────────────────────────────────
  const applyClusterDone = (
    clusters: PhotoCluster[],
    clusterId: string,
    cluster: PhotoCluster,
    remaining: DriveItem[],
    key: string,
    label: string,
  ) => {
    const minSize = cluster.type === 'duplicate' || cluster.type === 'burst' ? 2 : 1
    const updated = remaining.length < minSize
      ? clusters.filter(c => c.id !== clusterId)
      : clusters.map(c => {
          if (c.id !== clusterId) return c
          const newLabel = cluster.type === 'duplicate'
            ? `Duplicaten: ${remaining.length} foto's`
            : cluster.type === 'burst'
            ? cluster.label.replace(/\d+ foto's/, `${remaining.length} foto's`)
            : cluster.label
          return { ...c, photos: remaining, label: newLabel }
        })
    setPhase({ name: 'category', key, label, clusters: updated })
  }

  // ── Grid ──────────────────────────────────────────────────────────────────────
  if (phase.name === 'grid') {
    const cluster = phase.clusters.find(c => c.id === phase.clusterId)!
    return (
      <ClusterGridView
        msalInstance={msalInstance}
        account={account}
        cluster={cluster}
        onDone={(remaining) => applyClusterDone(phase.clusters, phase.clusterId, cluster, remaining, phase.key, phase.label)}
        onTriage={() => setPhase({ name: 'triage', key: phase.key, label: phase.label, clusters: phase.clusters, clusterId: phase.clusterId })}
      />
    )
  }

  // ── Triage ────────────────────────────────────────────────────────────────────
  if (phase.name === 'triage') {
    const cluster = phase.clusters.find(c => c.id === phase.clusterId)!
    return (
      <ClusterTriageView
        msalInstance={msalInstance}
        account={account}
        clusterLabel={cluster.label}
        initialPhotos={cluster.photos}
        sourceFolderId={folder.id}
        onDone={(remaining) => applyClusterDone(phase.clusters, phase.clusterId, cluster, remaining, phase.key, phase.label)}
      />
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  if (phase.name === 'dashboard' && result) {
    const totalLocationPhotos = result.locationClusters.reduce((s, c) => s + c.photos.length, 0)
    const totalMonthlyPhotos = result.monthlyGroups.reduce((s, g) => s + g.photos.length, 0)

    const categories = [
      {
        key: 'location',
        label: 'Op locatie',
        description: 'Vakanties en reizen gegroepeerd op GPS en datum',
        stat: `${result.locationClusters.length} clusters`,
        count: totalLocationPhotos,
        photoCount: totalLocationPhotos,
        icon: <LocationIcon />,
      },
      {
        key: 'screenshots',
        label: 'Schermafbeeldingen',
        description: 'Herkend op bestandsnaam en bestandstype',
        stat: null,
        count: result.screenshots.length,
        photoCount: result.screenshots.length,
        icon: <ScreenshotIcon />,
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp & social media',
        description: 'Herkend op bestandsnaam (WA, Instagram, Snapchat…)',
        stat: null,
        count: result.whatsapp.length,
        photoCount: result.whatsapp.length,
        icon: <ChatIcon />,
      },
      {
        key: 'monthly',
        label: 'Maandelijkse foto\'s',
        description: 'Camera-foto\'s zonder locatie, per maand gegroepeerd',
        stat: `${result.monthlyGroups.length} maanden`,
        count: totalMonthlyPhotos,
        photoCount: totalMonthlyPhotos,
        icon: <CalendarIcon />,
      },
      {
        key: 'bursts',
        label: 'Burst-reeksen',
        description: '3+ foto\'s binnen 3 seconden van dezelfde camera',
        stat: `${result.burstSets.length} reeksen`,
        count: result.burstSets.reduce((s, b) => s + b.photos.length, 0),
        photoCount: result.burstSets.reduce((s, b) => s + b.photos.length, 0),
        icon: <BurstIcon />,
      },
      {
        key: 'duplicates',
        label: 'Mogelijke duplicaten',
        description: 'Foto\'s met exact dezelfde opnamedatum en -tijd',
        stat: `${result.duplicateSets.length} sets`,
        count: result.duplicateSets.reduce((s, d) => s + d.photos.length, 0),
        photoCount: result.duplicateSets.reduce((s, d) => s + d.photos.length, 0),
        icon: <DuplicateIcon />,
      },
      {
        key: 'potential-junk',
        label: 'Mogelijk rommel',
        description: 'Kleine foto\'s (< 800 KB) zonder GPS — quick snaps, toevallige opnames',
        stat: result.potentialJunk.length > 0
          ? `${splitByMonth(result.potentialJunk, 'potential-junk').length} maanden`
          : null,
        count: result.potentialJunk.length,
        photoCount: result.potentialJunk.length,
        icon: <JunkIcon />,
      },
      {
        key: 'other-camera',
        label: 'Andere camera\'s',
        description: 'Foto\'s niet gemaakt met een iPhone, gegroepeerd per merk',
        stat: result.otherCameraGroups.length > 0
          ? `${result.otherCameraGroups.length} merk${result.otherCameraGroups.length !== 1 ? 'en' : ''}`
          : null,
        count: result.otherCameraGroups.reduce((s, g) => s + g.photos.length, 0),
        photoCount: result.otherCameraGroups.reduce((s, g) => s + g.photos.length, 0),
        icon: <OtherCameraIcon />,
      },
    ]

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 h-10 flex-shrink-0"
          style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
        >
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
          <span className="ml-auto text-xs text-fluent-text-disabled flex-shrink-0 tabular-nums">
            {result.totalPhotos} foto's geanalyseerd
          </span>
        </div>

        {/* Categorie grid */}
        <div className="flex-1 overflow-y-auto bg-fluent-bg-secondary">
          <div className="max-w-3xl mx-auto px-4 py-5">
            <p className="text-xs font-semibold text-fluent-text-secondary uppercase tracking-wider mb-3">
              Kies een categorie
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map(cat => {
                const colors = CATEGORY_COLORS[cat.key]
                const active = cat.count > 0

                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      if (!active) return
                      setPhase({ name: 'category', key: cat.key, label: cat.label, clusters: buildClusters(cat.key, result) })
                    }}
                    disabled={!active}
                    className={`group flex items-start gap-3 px-4 py-4 text-left w-full rounded-2xl shadow-card transition-all ${
                      active ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default opacity-50'
                    }`}
                    style={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={e => {
                      if (!active) return
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = colors.accentBorder
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = 'var(--color-border)'
                    }}
                  >
                    {/* Icoon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: colors.iconBg, color: colors.iconColor }}
                    >
                      {cat.icon}
                    </div>

                    {/* Tekst */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-fluent-text-primary leading-tight">
                          {cat.label}
                        </span>
                        {active && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
                              style={{ background: colors.iconBg, color: colors.iconColor }}
                            >
                              {cat.photoCount}
                            </span>
                            <svg
                              className="w-3.5 h-3.5 text-fluent-text-disabled transition-colors group-hover:text-fluent-text-secondary"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-fluent-text-secondary mt-0.5 leading-relaxed">
                        {cat.description}
                      </p>
                      {active && cat.stat && (
                        <p className="text-xs mt-1.5" style={{ color: colors.iconColor }}>
                          {cat.stat}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Categorie-clusters ────────────────────────────────────────────────────────
  const { key: categoryKey, label: categoryLabel, clusters } = phase as Extract<Phase, { name: 'category' }>

  if (clusters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center bg-fluent-bg-secondary">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-success-light)' }}
        >
          <svg className="w-7 h-7 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-fluent-text-primary">Alles verwerkt</h2>
          <p className="text-fluent-text-secondary text-sm mt-1">
            Alle pakketjes in "{categoryLabel}" zijn verwerkt.
          </p>
        </div>
        <Button variant="primary" onClick={() => setPhase({ name: 'dashboard' })}>
          Terug naar overzicht
        </Button>
      </div>
    )
  }

  const categoryColors = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS['other-camera']

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 h-10 flex-shrink-0"
        style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() => setPhase({ name: 'dashboard' })}
          className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Terug
        </button>
        <span className="text-fluent-text-disabled text-sm">·</span>
        <span className="text-sm font-semibold text-fluent-text-primary truncate">{categoryLabel}</span>
        <span className="ml-auto text-xs text-fluent-text-disabled flex-shrink-0 tabular-nums">
          {clusters.length} pakket{clusters.length !== 1 ? 'jes' : ''}
        </span>
      </div>

      {/* Cluster lijst */}
      <div className="flex-1 overflow-y-auto bg-fluent-bg-secondary">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {clusters.map(cluster => {
            const isMoving = moveProgress?.clusterId === cluster.id
            const thumbs = cluster.photos.slice(0, 6).filter(p => p.thumbnails?.[0]?.medium?.url)
            const extraCount = Math.max(0, cluster.photos.length - thumbs.length)

            return (
              <div
                key={cluster.id}
                className="rounded-2xl bg-fluent-bg-primary shadow-card overflow-hidden"
              >
                {/* Thumbnail strip */}
                {thumbs.length > 0 && (
                  <button
                    onClick={() => setPhase({ name: 'grid', key: categoryKey, label: categoryLabel, clusters, clusterId: cluster.id })}
                    disabled={busy}
                    className="w-full flex items-stretch gap-px overflow-hidden disabled:pointer-events-none"
                    style={{ height: 80 }}
                  >
                    {thumbs.map((photo, idx) => (
                      <div key={photo.id} className="relative flex-1 min-w-0 overflow-hidden bg-fluent-bg-hover">
                        <img
                          src={photo.thumbnails![0].medium!.url}
                          alt=""
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                        {idx === thumbs.length - 1 && extraCount > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-white text-xs font-semibold">+{extraCount}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </button>
                )}

                {/* Inhoud */}
                <div className="p-3.5 space-y-3">
                  {/* Titel + meta */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: categoryColors.iconBg, color: categoryColors.iconColor }}
                    >
                      <ClusterIcon type={cluster.type} small />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-fluent-text-primary text-sm leading-snug">{cluster.label}</p>
                      <p className="text-fluent-text-secondary text-xs mt-0.5">
                        {cluster.photos.length} foto{cluster.photos.length !== 1 ? "'s" : ''}
                        {cluster.startDate && cluster.endDate && (
                          <> · {formatDateRange(cluster.startDate, cluster.endDate)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Voortgang tijdens verplaatsen */}
                  {isMoving && moveProgress && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-fluent-text-secondary tabular-nums">
                        Verplaatsen… {moveProgress.done} / {moveProgress.total}
                      </p>
                      <div className="h-[3px] rounded-full bg-fluent-border overflow-hidden">
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
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 min-w-0"
                        onClick={() => setActiveSheet(cluster)}
                        disabled={busy}
                        icon={
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          </svg>
                        }
                      >
                        <span className="truncate">Verplaatsen</span>
                      </Button>
                      <Button
                        variant="neutral"
                        size="sm"
                        className="flex-1 min-w-0"
                        onClick={() => setPhase({ name: 'triage', key: categoryKey, label: categoryLabel, clusters, clusterId: cluster.id })}
                        disabled={busy}
                        icon={
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        }
                      >
                        <span className="truncate">Één voor één</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSkip(cluster.id)} disabled={busy}>
                        Overslaan
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Folder sheet */}
      {activeSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="flex-1 bg-black/40 animate-fade" onClick={() => setActiveSheet(null)} />
          <div
            className="flex flex-col rounded-t-3xl pb-safe animate-sheet"
            style={{
              height: '60vh',
              background: 'var(--color-bg-primary)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
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
                onMove={(f, bc) => handleBulkMove(activeSheet, f, bc)}
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function ClusterIcon({ type, small }: { type: ClusterType; small?: boolean }) {
  const size = small ? 'w-4 h-4' : 'w-5 h-5'
  if (type === 'location')      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  if (type === 'screenshots')   return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  if (type === 'whatsapp')      return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  if (type === 'monthly')       return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  if (type === 'burst')         return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  if (type === 'duplicate')     return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
  if (type === 'other-camera')  return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  if (type === 'potential-junk') return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
  return <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}

function LocationIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function ScreenshotIcon()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> }
function ChatIcon()        { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> }
function CalendarIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
function BurstIcon()       { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> }
function DuplicateIcon()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> }
function OtherCameraIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function JunkIcon()        { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> }
