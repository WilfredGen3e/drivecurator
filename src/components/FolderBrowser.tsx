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

interface SavedFolder { id: string; name: string }

const FAVORITE_KEY = 'drivecurator_favorite_folder'
const LAST_FOLDER_KEY = 'drivecurator_last_folder'

function loadFavorite(): SavedFolder | null {
  try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) ?? 'null') } catch { return null }
}

function saveFavorite(folder: SavedFolder | null) {
  if (folder) localStorage.setItem(FAVORITE_KEY, JSON.stringify(folder))
  else localStorage.removeItem(FAVORITE_KEY)
}

function loadLastFolder(): SavedFolder | null {
  try { return JSON.parse(localStorage.getItem(LAST_FOLDER_KEY) ?? 'null') } catch { return null }
}

export default function FolderBrowser({ msalInstance, account, onBack, onFolderSelected }: Props) {
  const [folders, setFolders] = useState<DriveItem[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)
  const [favorite, setFavorite] = useState<SavedFolder | null>(() => loadFavorite())
  const [lastFolder] = useState<SavedFolder | null>(() => loadLastFolder())
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
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
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

  const handleSelect = (folder: SavedFolder) => {
    if (onFolderSelected) onFolderSelected(folder)
    else handleStartTriage(folder)
  }

  const handleToggleFavorite = (folder: DriveItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const isFav = favorite?.id === folder.id
    const next = isFav ? null : { id: folder.id, name: folder.name }
    saveFavorite(next)
    setFavorite(next)
  }

  const currentFolder = breadcrumb[breadcrumb.length - 1] ?? null
  const showLastFolder = lastFolder && lastFolder.id !== favorite?.id

  return (
    <div className="h-full overflow-y-auto bg-fluent-bg-secondary">
      <div className="max-w-xl mx-auto px-5 py-6 space-y-4">

        {/* Terug + titel + breadcrumb */}
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-fluent-text-secondary hover:text-fluent-text-primary text-sm mb-3 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug
            </button>
          )}
          <h2 className="text-base font-semibold text-fluent-text-primary mb-2">
            Kies een map om op te schonen
          </h2>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 flex-wrap">
            <button
              onClick={handleRootClick}
              className="flex items-center gap-1 text-sm text-fluent-accent hover:text-fluent-accent-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              OneDrive
            </button>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <svg className="w-3 h-3 text-fluent-text-disabled flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <button
                  onClick={() => handleBreadcrumbClick(i)}
                  className={`text-sm transition-colors ${
                    i === breadcrumb.length - 1
                      ? 'text-fluent-text-primary font-medium'
                      : 'text-fluent-accent hover:text-fluent-accent-hover'
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </nav>
        </div>

        {/* Snelkoppelingen */}
        {(favorite || showLastFolder) && (
          <div
            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 4 }}
          >
            <div
              className="px-4 py-2"
              style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', borderRadius: '4px 4px 0 0' }}
            >
              <span className="text-xs font-semibold text-fluent-text-secondary uppercase tracking-wider">
                Snelkoppelingen
              </span>
            </div>

            {favorite && (
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: showLastFolder ? '1px solid var(--color-border)' : 'none' }}
              >
                <svg className="w-4 h-4 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm text-fluent-text-primary flex-1 truncate">{favorite.name}</span>
                <button
                  onClick={() => handleSelect(favorite)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-fluent-accent hover:bg-fluent-accent-hover text-white text-xs font-semibold transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <PlayIcon />
                  Starten
                </button>
              </div>
            )}

            {showLastFolder && (
              <div className="flex items-center gap-3 px-4 py-3">
                <svg className="w-4 h-4 flex-shrink-0 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-fluent-text-primary flex-1 truncate">{lastFolder!.name}</span>
                <button
                  onClick={() => handleSelect(lastFolder!)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-fluent-border-strong text-fluent-text-secondary hover:bg-fluent-bg-hover text-xs font-semibold transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Doorgaan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Start huidige map */}
        {currentFolder && (
          <button
            onClick={() => handleSelect(currentFolder)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-left bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold text-sm transition-colors"
            style={{ borderRadius: 2 }}
          >
            <PlayIcon />
            <span>
              {onFolderSelected ? `Selecteer "${currentFolder.name}"` : `Start in "${currentFolder.name}"`}
            </span>
          </button>
        )}

        {/* Mappenlijst */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <svg className="w-8 h-8 text-fluent-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <p className="text-fluent-text-secondary text-sm">Geen submappen gevonden</p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
            {currentFolder && (
              <div
                className="px-4 py-2"
                style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="text-xs font-semibold text-fluent-text-secondary uppercase tracking-wider">
                  Submappen
                </span>
              </div>
            )}
            {folders.map((folder, i) => {
              const isFav = favorite?.id === folder.id
              return (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 px-4 hover:bg-fluent-bg-hover transition-colors"
                  style={{
                    background: 'var(--color-bg-primary)',
                    borderBottom: i < folders.length - 1 ? '1px solid var(--color-border)' : 'none',
                    minHeight: 44,
                  }}
                >
                  {/* Map naam + navigeer in */}
                  <button
                    onClick={() => handleFolderClick(folder)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left py-2.5"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0 text-amber-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="text-sm text-fluent-text-primary flex-1 truncate">{folder.name}</span>
                  </button>

                  {/* Ster: favoriet */}
                  <button
                    onClick={e => handleToggleFavorite(folder, e)}
                    title={isFav ? 'Verwijder als favoriet' : 'Stel in als favoriet'}
                    className={`flex-shrink-0 p-1.5 transition-colors ${
                      isFav ? 'text-amber-400 hover:text-amber-500' : 'text-fluent-text-disabled hover:text-amber-400'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={isFav ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={isFav ? 0 : 1.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>

                  {/* Chevron: navigeer in */}
                  <button
                    onClick={() => handleFolderClick(folder)}
                    className="flex-shrink-0 p-1.5 text-fluent-text-disabled hover:text-fluent-text-secondary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  )
}
