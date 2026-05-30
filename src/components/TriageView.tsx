import { useRef, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { DriveItem, deleteItem, moveItem } from '../services/graphService'

function PhotoMeta({ photo }: { photo: DriveItem }) {
  const date = photo.photo?.takenDateTime ?? photo.fileSystemInfo?.createdDateTime
  const camera = [photo.photo?.cameraMake, photo.photo?.cameraModel].filter(Boolean).join(' ')
  const size = photo.size ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : null

  const formattedDate = date
    ? new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
    : null

  if (!formattedDate && !camera && !size) return null

  return (
    <div className="flex items-center justify-center gap-3 text-xs text-gray-500 flex-wrap">
      {formattedDate && <span>{formattedDate}</span>}
      {camera && <span>· {camera}</span>}
      {size && <span>· {size}</span>}
    </div>
  )
}
import { useAppStore } from '../store/useAppStore'
import FolderSidebar from './FolderSidebar'
import UndoToast from './UndoToast'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onBack: () => void
}

export default function TriageView({ msalInstance, account, onBack }: Props) {
  const { photos, currentIndex, currentFolderName, currentFolderId, nextPhoto, prevPhoto, pushUndo, popUndo, fullyLoaded } = useAppStore()
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const photo = photos[currentIndex]
  const total = photos.length
  const done = currentIndex >= total

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const handleDelete = async () => {
    if (!photo || busy) return
    setBusy(true)
    try {
      await deleteItem(msalInstance, account, photo.id)
      pushUndo({ type: 'delete', item: photo, previousFolderId: currentFolderId! })
      nextPhoto()
      showToast(`"${photo.name}" verwijderd`)
    } finally {
      setBusy(false)
    }
  }

  const handleKeep = () => {
    if (!photo || busy) return
    nextPhoto()
  }

  const handleMove = async (targetFolder: DriveItem) => {
    if (!photo || busy) return
    setBusy(true)
    try {
      await moveItem(msalInstance, account, photo.id, targetFolder.id)
      pushUndo({ type: 'move', item: photo, previousFolderId: currentFolderId! })
      nextPhoto()
      showToast(`Verplaatst naar "${targetFolder.name}"`)
    } finally {
      setBusy(false)
    }
  }

  const handleUndo = async () => {
    const action = popUndo()
    if (!action) return
    setToast(null)
    setBusy(true)
    try {
      if (action.type === 'move') {
        await moveItem(msalInstance, account, action.item.id, action.previousFolderId)
        showToast('Verplaatsing ongedaan gemaakt')
      } else {
        showToast('Verwijderde foto\'s staan in de OneDrive prullenbak')
      }
    } finally {
      setBusy(false)
    }
  }

  const thumbnail = photo?.thumbnails?.[0]?.medium?.url

  if (done || !photo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-6">
        {done && total > 0 ? (
          <>
            <div className="text-5xl">✓</div>
            <h2 className="text-2xl font-bold text-white">Klaar!</h2>
            <p className="text-gray-400">Je hebt alle {total} foto's in <strong>{currentFolderName}</strong> beoordeeld.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white">Geen foto's gevonden</h2>
            <p className="text-gray-400">Deze map bevat geen afbeeldingen.</p>
          </>
        )}
        <button onClick={onBack} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
          Andere map kiezen
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* sidebar */}
      <div className={`flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <FolderSidebar
          msalInstance={msalInstance}
          account={account}
          onMove={handleMove}
          disabled={busy}
        />
      </div>

      {/* hoofdpaneel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* topbalk */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
            title="Sidebar tonen/verbergen"
          >
            <SidebarIcon />
          </button>
          <button onClick={onBack} className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Terug
          </button>
          <span className="text-gray-400 text-sm font-medium truncate flex-1 text-center">{currentFolderName}</span>
          <span className="text-gray-500 text-sm flex-shrink-0">
            {currentIndex + 1} / {total}{!fullyLoaded && '+'}
          </span>
        </div>

        {/* voortgangsbalk */}
        <div className="h-1 bg-gray-800 flex-shrink-0">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(currentIndex / total) * 100}%` }}
          />
        </div>

        {/* foto — vult alle beschikbare ruimte */}
        <div className="flex-1 min-h-0 px-3 pt-2">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={photo.name}
              className="w-full h-full object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 text-xs text-center px-4">{photo.name}</span>
            </div>
          )}
        </div>

        {/* metadata + knoppen — vaste hoogte onderaan */}
        <div className="flex-shrink-0 px-4 pt-2 pb-4 space-y-3">
          <div className="text-center space-y-0.5">
            <p className="text-gray-600 text-xs truncate">{photo.name}</p>
            <PhotoMeta photo={photo} />
          </div>
          <div className="flex items-center justify-center gap-8">
            <ActionBtn onClick={prevPhoto} disabled={currentIndex === 0} color="gray" label="Vorige">
              <PrevIcon />
            </ActionBtn>
            <ActionBtn onClick={handleDelete} disabled={busy} color="red" label="Verwijderen">
              <TrashIcon />
            </ActionBtn>
            <ActionBtn onClick={handleKeep} disabled={busy} color="green" label="Volgende">
              <NextIcon />
            </ActionBtn>
          </div>
        </div>
      </div>

      {toast && <UndoToast message={toast.message} onUndo={handleUndo} />}
    </div>
  )
}

function ActionBtn({ onClick, disabled, color, label, children }: {
  onClick: () => void
  disabled: boolean
  color: 'red' | 'green' | 'gray'
  label: string
  children: React.ReactNode
}) {
  const colors = {
    red: 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border-red-500/30',
    green: 'bg-green-500/20 text-green-400 hover:bg-green-500/40 border-green-500/30',
    gray: 'bg-gray-700/40 text-gray-400 hover:bg-gray-700 border-gray-600/30',
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-14 h-14 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30 ${colors[color]}`}
      >
        {children}
      </button>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function PrevIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function SidebarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
