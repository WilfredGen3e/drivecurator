import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getRootFolders, getSubFolders, createFolder } from '../services/graphService'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onMove: (folder: DriveItem) => void
  disabled: boolean
}

interface Crumb { id: string; name: string }

export default function FolderSidebar({ msalInstance, account, onMove, disabled }: Props) {
  const [folders, setFolders] = useState<DriveItem[]>([])
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([])
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

  useEffect(() => { loadFolders(null) }, [])

  const handleNavigate = async (folder: DriveItem) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
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
      setFolders((prev) => [...prev, folder])
      setNewFolderName('')
      setShowInput(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-fluent-bg-secondary border-r border-fluent-border">
      {/* breadcrumb */}
      <div className="px-3 py-2 border-b border-fluent-border min-h-[40px] flex items-center">
        <div className="flex items-center gap-1 flex-wrap text-xs min-w-0">
          <button onClick={handleRoot} className="text-fluent-accent hover:underline truncate max-w-[60px] transition-colors">
            OneDrive
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1 min-w-0">
              <span className="text-fluent-text-disabled">/</span>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`transition-colors truncate max-w-[72px] ${i === breadcrumb.length - 1 ? 'text-fluent-text-primary font-medium' : 'text-fluent-accent hover:underline'}`}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* mappenlijst */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-4 h-4 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : folders.length === 0 ? (
          <p className="text-fluent-text-disabled text-xs text-center py-6 px-3">Geen mappen</p>
        ) : (
          folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1 px-2 py-1 hover:bg-fluent-bg-hover group border-b border-fluent-border last:border-0">
              <button
                onClick={() => handleNavigate(folder)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left py-0.5"
                title={folder.name}
              >
                <FolderIcon />
                <span className="text-sm text-fluent-text-primary truncate">{folder.name}</span>
              </button>
              <button
                onClick={() => onMove(folder)}
                disabled={disabled}
                title={`Verplaats naar ${folder.name}`}
                className="flex-shrink-0 p-1.5 text-fluent-text-disabled hover:text-white hover:bg-fluent-accent transition-colors disabled:opacity-30"
                style={{ borderRadius: 2 }}
              >
                <MoveArrowIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {/* nieuwe map */}
      <div className="border-t border-fluent-border p-2">
        {showInput ? (
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowInput(false) }}
              placeholder="Mapnaam..."
              className="flex-1 bg-fluent-bg-primary text-fluent-text-primary text-sm px-2 py-1 border border-fluent-border-strong focus:outline-none focus:border-fluent-accent min-w-0"
              style={{ borderRadius: 2 }}
            />
            <button
              onClick={handleCreateFolder}
              disabled={creating || !newFolderName.trim()}
              className="px-2 py-1 bg-fluent-accent text-white text-sm hover:bg-fluent-accent-hover disabled:opacity-40 transition-colors flex-shrink-0"
              style={{ borderRadius: 2 }}
            >
              {creating ? '…' : '✓'}
            </button>
            <button
              onClick={() => { setShowInput(false); setNewFolderName('') }}
              className="px-2 py-1 text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover text-sm transition-colors flex-shrink-0"
              style={{ borderRadius: 2 }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-fluent-text-secondary hover:text-fluent-text-primary text-sm hover:bg-fluent-bg-hover transition-colors"
            style={{ borderRadius: 2 }}
          >
            <span className="text-base leading-none">+</span>
            <span>Nieuwe map</span>
          </button>
        )}
      </div>
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

function MoveArrowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  )
}
