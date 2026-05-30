import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, getRootFolders, getFolderContents } from '../services/graphService'
import { useAppStore } from '../store/useAppStore'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
}

export default function FolderBrowser({ msalInstance, account }: Props) {
  const [rootFolders, setRootFolders] = useState<DriveItem[]>([])
  const [subFolders, setSubFolders] = useState<DriveItem[]>([])
  const [selectedRoot, setSelectedRoot] = useState<DriveItem | null>(null)
  const [loadingFolders, setLoadingFolders] = useState(true)
  const { setFolder, setPhotos, setLoading, setError } = useAppStore()

  useEffect(() => {
    getRootFolders(msalInstance, account)
      .then(setRootFolders)
      .catch(() => setError('Kon mappen niet ophalen'))
      .finally(() => setLoadingFolders(false))
  }, [msalInstance, account, setError])

  const handleRootSelect = async (folder: DriveItem) => {
    setSelectedRoot(folder)
    setSubFolders([])
    try {
      const items = await getFolderContents(msalInstance, account, folder.id)
      const folders = items.filter((i) => i.folder)
      setSubFolders(folders as DriveItem[])
    } catch {
      // geen submappen beschikbaar
    }
  }

  const handleStartTriage = async (folder: DriveItem) => {
    setFolder(folder.id, folder.name)
    setLoading(true)
    try {
      const photos = await getFolderContents(msalInstance, account, folder.id)
      setPhotos(photos)
    } catch {
      setError('Kon foto\'s niet ophalen')
    } finally {
      setLoading(false)
    }
  }

  if (loadingFolders) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Kies een map om op te schonen</h2>
        <p className="text-gray-500 text-sm">Selecteer een OneDrive-map om te starten</p>
      </div>

      <div className="space-y-2">
        {rootFolders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => handleRootSelect(folder)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              selectedRoot?.id === folder.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            <FolderIcon />
            <span>{folder.name}</span>
          </button>
        ))}
      </div>

      {selectedRoot && (
        <div className="space-y-2 pt-2 border-t border-gray-800">
          <p className="text-gray-500 text-sm">Of kies een submap:</p>
          <button
            onClick={() => handleStartTriage(selectedRoot)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <FolderIcon />
            <span className="font-medium">{selectedRoot.name} (hele map)</span>
            <span className="ml-auto text-blue-400 text-sm">Start →</span>
          </button>
          {subFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleStartTriage(folder)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <FolderIcon className="text-gray-400" />
              <span>{folder.name}</span>
              <span className="ml-auto text-blue-400 text-sm">Start →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FolderIcon({ className = 'text-blue-400' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 flex-shrink-0 ${className}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}
