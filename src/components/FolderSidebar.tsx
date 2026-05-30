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
    if (!name || !currentId) return
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
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* breadcrumb */}
      <div className="px-3 py-3 border-b border-gray-800 min-h-[48px]">
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <button onClick={handleRoot} className="text-blue-400 hover:text-blue-300 transition-colors truncate max-w-[60px]">
            OneDrive
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1 min-w-0">
              <span className="text-gray-600">/</span>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`transition-colors truncate max-w-[80px] ${i === breadcrumb.length - 1 ? 'text-white' : 'text-blue-400 hover:text-blue-300'}`}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* mappenlijst */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : folders.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-6 px-3">Geen mappen</p>
        ) : (
          folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1 px-2 py-1 group hover:bg-gray-800 rounded mx-1">
              {/* navigeer in map */}
              <button
                onClick={() => handleNavigate(folder)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                title={folder.name}
              >
                <FolderIcon />
                <span className="text-sm text-gray-300 truncate">{folder.name}</span>
              </button>
              {/* verplaats naar deze map */}
              <button
                onClick={() => onMove(folder)}
                disabled={disabled}
                title={`Verplaats naar ${folder.name}`}
                className="flex-shrink-0 p-1.5 rounded text-gray-500 hover:text-white hover:bg-blue-600 transition-colors disabled:opacity-30"
              >
                <MoveArrowIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {/* nieuwe map aanmaken */}
      {currentId && (
        <div className="border-t border-gray-800 p-2">
          {showInput ? (
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowInput(false) }}
                placeholder="Mapnaam..."
                className="flex-1 bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-700 focus:outline-none focus:border-blue-500 min-w-0"
              />
              <button
                onClick={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
                className="px-2 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {creating ? '…' : '✓'}
              </button>
              <button
                onClick={() => { setShowInput(false); setNewFolderName('') }}
                className="px-2 py-1.5 text-gray-400 hover:text-white text-sm rounded transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-gray-500 hover:text-white text-sm rounded hover:bg-gray-800 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              <span>Nieuwe map</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
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
