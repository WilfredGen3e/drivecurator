import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getRootFolders, getSubFolders, getFolderContents } from '../services/graphService'
import { useAppStore } from '../store/useAppStore'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onBack?: () => void
  onFolderSelected?: (folder: { id: string; name: string }) => void
}

interface BreadcrumbItem {
  id: string
  name: string
}

export default function FolderBrowser({ msalInstance, account, onBack, onFolderSelected }: Props) {
  const [folders, setFolders] = useState<DriveItem[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)
  const { setFolder, setPhotos, appendPhotos, setLoading: setAppLoading, setFullyLoaded, setError } = useAppStore()

  const loadFolders = async (parentId: string | null) => {
    setLoading(true)
    try {
      const items = parentId
        ? await getSubFolders(msalInstance, account, parentId)
        : await getRootFolders(msalInstance, account)
      setFolders(items)
    } catch {
      setError('Kon mappen niet ophalen')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFolders(null) }, [msalInstance, account])

  const handleFolderClick = async (folder: DriveItem) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
    await loadFolders(folder.id)
  }

  const handleBreadcrumbClick = async (index: number) => {
    const next = breadcrumb.slice(0, index + 1)
    setBreadcrumb(next)
    await loadFolders(next[next.length - 1].id)
  }

  const handleRootClick = async () => {
    setBreadcrumb([])
    await loadFolders(null)
  }

  const handleStartTriage = async (folder: BreadcrumbItem | DriveItem) => {
    setFolder(folder.id, folder.name)
    setAppLoading(true)
    try {
      await getFolderContents(msalInstance, account, folder.id, (photos, isFirst) => {
        if (isFirst) {
          setPhotos(photos)
          setAppLoading(false)
        } else {
          appendPhotos(photos)
        }
      })
      setFullyLoaded(true)
    } catch {
      setError("Kon foto's niet ophalen")
      setAppLoading(false)
    }
  }

  const currentFolder = breadcrumb[breadcrumb.length - 1] ?? null

  return (
    <div className="max-w-xl mx-auto px-6 py-8 space-y-5">
      {/* titel + breadcrumb */}
      <div>
        {onBack && (
          <button onClick={onBack} className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm mb-3 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>
        )}
        <h2 className="text-lg font-semibold text-fluent-text-primary">Kies een map om op te schonen</h2>
        <nav className="flex items-center gap-1 flex-wrap mt-1.5">
          <button onClick={handleRootClick} className="text-sm text-fluent-accent hover:underline transition-colors">
            OneDrive
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <span className="text-fluent-text-disabled">/</span>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`text-sm transition-colors ${i === breadcrumb.length - 1 ? 'text-fluent-text-primary font-medium' : 'text-fluent-accent hover:underline'}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      </div>

      {/* start-knop voor huidige map */}
      {currentFolder && (
        <button
          onClick={() => onFolderSelected
            ? onFolderSelected(currentFolder)
            : handleStartTriage(currentFolder)
          }
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold text-sm transition-colors"
          style={{ borderRadius: 2 }}
        >
          <PlayIcon />
          <span>{onFolderSelected ? `Analyseren in "${currentFolder.name}"` : `Start in "${currentFolder.name}"`}</span>
        </button>
      )}

      {/* mappenlijst */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : folders.length === 0 ? (
        <p className="text-fluent-text-secondary text-sm text-center py-6">Geen mappen gevonden</p>
      ) : (
        <div className="border border-fluent-border">
          {currentFolder && (
            <div className="px-4 py-1.5 bg-fluent-bg-secondary border-b border-fluent-border">
              <span className="text-xs font-semibold text-fluent-text-secondary uppercase tracking-wider">Submappen</span>
            </div>
          )}
          {folders.map((folder, i) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-fluent-bg-hover transition-colors ${i < folders.length - 1 ? 'border-b border-fluent-border' : ''}`}
            >
              <FolderIcon />
              <span className="text-sm text-fluent-text-primary flex-1">{folder.name}</span>
              <ChevronIcon />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-fluent-text-disabled flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  )
}
