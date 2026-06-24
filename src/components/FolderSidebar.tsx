import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getRootFolders, getSubFolders, createFolder } from '../services/graphService'

export interface Crumb { id: string; name: string }

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onMove: (folder: DriveItem, breadcrumb: Crumb[]) => void
  disabled: boolean
  initialBreadcrumb?: Crumb[]
}

export default function FolderSidebar({ msalInstance, account, onMove, disabled, initialBreadcrumb }: Props) {
  const [folders, setFolders] = useState<DriveItem[]>([])
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>(initialBreadcrumb ?? [])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const currentId = breadcrumb[breadcrumb.length - 1]?.id ?? null

  const loadFolders = async (parentId: string | null) => {
    setLoading(true)
    try {
      const items = parentId
        ? await getSubFolders(msalInstance, account, parentId)
        : await getRootFolders(msalInstance, account)
      setFolders(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const startId = initialBreadcrumb?.length ? initialBreadcrumb[initialBreadcrumb.length - 1].id : null
    loadFolders(startId)
  }, [])

  const handleNavigate = async (folder: DriveItem) => {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    await loadFolders(folder.id)
  }

  const handleBreadcrumbClick = async (index: number) => {
    const next = breadcrumb.slice(0, index + 1)
    setBreadcrumb(next)
    await loadFolders(next[next.length - 1].id)
  }

  const handleRoot = async () => {
    setBreadcrumb([])
    await loadFolders(null)
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreating(true)
    try {
      const folder = await createFolder(msalInstance, account, currentId, name)
      setFolders(prev => [...prev, folder])
      setNewFolderName('')
      setShowInput(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--color-bg-secondary)', borderRight: '1px solid var(--color-border)' }}
    >
      {/* Breadcrumb */}
      <div
        className="px-3 py-2 flex items-center min-h-[38px]"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-0.5 flex-wrap text-xs min-w-0">
          <button
            onClick={handleRoot}
            className="text-fluent-accent hover:text-fluent-accent-hover transition-colors truncate max-w-[60px]"
          >
            OneDrive
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-0.5 min-w-0">
              <svg className="w-3 h-3 text-fluent-text-disabled flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`transition-colors truncate max-w-[68px] ${
                  i === breadcrumb.length - 1
                    ? 'text-fluent-text-primary font-medium'
                    : 'text-fluent-accent hover:text-fluent-accent-hover'
                }`}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Mappenlijst */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-4 h-4 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : folders.length === 0 ? (
          <p className="text-fluent-text-disabled text-xs text-center py-6 px-3">Geen mappen</p>
        ) : (
          folders.map(folder => (
            <div
              key={folder.id}
              className="flex items-center gap-1 mx-1.5 px-1.5 my-0.5 rounded-xl hover:bg-fluent-bg-hover transition-colors"
            >
              {/* Navigeer in map */}
              <button
                onClick={() => handleNavigate(folder)}
                className="flex items-center gap-2 min-w-0 text-left py-2"
                title={folder.name}
              >
                <svg className="w-4 h-4 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="text-sm text-fluent-text-primary truncate">{folder.name}</span>
              </button>

              {/* Verplaats naar deze map */}
              <button
                onClick={() => onMove(folder, breadcrumb)}
                disabled={disabled}
                title={`Verplaats naar ${folder.name}`}
                className="flex-shrink-0 p-2 rounded-lg text-fluent-text-secondary hover:text-white hover:bg-fluent-accent active:scale-[0.94] transition-all disabled:opacity-30"
              >
                <MoveArrowIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Nieuwe map */}
      <div className="p-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        {showInput ? (
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') setShowInput(false)
              }}
              placeholder="Mapnaam..."
              className="flex-1 bg-fluent-bg-primary text-fluent-text-primary text-sm px-3 py-2 rounded-lg border border-fluent-border-strong focus:outline-none focus:border-fluent-accent min-w-0"
            />
            <button
              onClick={handleCreateFolder}
              disabled={creating || !newFolderName.trim()}
              className="px-3 py-2 rounded-lg bg-fluent-accent text-white text-sm hover:bg-fluent-accent-hover active:scale-[0.94] disabled:opacity-40 transition-all flex-shrink-0"
            >
              {creating ? '…' : '✓'}
            </button>
            <button
              onClick={() => { setShowInput(false); setNewFolderName('') }}
              className="px-3 py-2 rounded-lg text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover text-sm transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-fluent-text-secondary hover:text-fluent-text-primary text-sm hover:bg-fluent-bg-hover transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>Nieuwe map</span>
          </button>
        )}
      </div>
    </div>
  )
}

function MoveArrowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v4m0 0l-2-2m2 2l2-2" />
    </svg>
  )
}
