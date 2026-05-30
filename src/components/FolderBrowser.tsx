import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getRootFolders, getSubFolders, getFolderContents } from '../services/graphService'
import { useAppStore } from '../store/useAppStore'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
}

interface BreadcrumbItem {
  id: string
  name: string
}

export default function FolderBrowser({ msalInstance, account }: Props) {
  const [folders, setFolders] = useState<DriveItem[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)
  const { setFolder, setPhotos, setLoading: setAppLoading, setError } = useAppStore()

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

  useEffect(() => {
    loadFolders(null)
  }, [msalInstance, account])

  const handleFolderClick = async (folder: DriveItem) => {
    const newBreadcrumb = [...breadcrumb, { id: folder.id, name: folder.name }]
    setBreadcrumb(newBreadcrumb)
    await loadFolders(folder.id)
  }

  const handleBreadcrumbClick = async (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    const parentId = newBreadcrumb[newBreadcrumb.length - 1]?.id ?? null
    await loadFolders(parentId)
  }

  const handleRootClick = async () => {
    setBreadcrumb([])
    await loadFolders(null)
  }

  const handleStartTriage = async (folder: BreadcrumbItem | DriveItem) => {
    setFolder(folder.id, folder.name)
    setAppLoading(true)
    try {
      const photos = await getFolderContents(msalInstance, account, folder.id)
      setPhotos(photos)
    } catch {
      setError('Kon foto\'s niet ophalen')
    } finally {
      setAppLoading(false)
    }
  }

  const currentFolder = breadcrumb[breadcrumb.length - 1] ?? null

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Kies een map om op te schonen</h2>

        {/* breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap mt-2">
          <button onClick={handleRootClick} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            OneDrive
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <span className="text-gray-600">/</span>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`text-sm transition-colors ${i === breadcrumb.length - 1 ? 'text-white' : 'text-blue-400 hover:text-blue-300'}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* start triage in huidige map */}
      {currentFolder && (
        <button
          onClick={() => handleStartTriage(currentFolder)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          <PlayIcon />
          <span className="font-medium">Start in "{currentFolder.name}"</span>
        </button>
      )}

      {/* submappen */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : folders.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">Geen submappen gevonden</p>
      ) : (
        <div className="space-y-2">
          {currentFolder && <p className="text-gray-500 text-xs uppercase tracking-wider">Submappen</p>}
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <FolderIcon />
              <span>{folder.name}</span>
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
    <svg className="w-5 h-5 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  )
}
