import { DriveItem } from '../services/graphService'

interface Props {
  onDelete: () => void
  onKeep: () => void
  onMove: () => void
  folders: DriveItem[]
  showFolderPicker: boolean
  onSelectFolder: (folder: DriveItem) => void
  onClosePicker: () => void
  disabled: boolean
}

export default function ActionBar({
  onDelete,
  onKeep,
  onMove,
  folders,
  showFolderPicker,
  onSelectFolder,
  onClosePicker,
  disabled,
}: Props) {
  return (
    <div className="relative">
      {showFolderPicker && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 bg-gray-800 rounded-xl shadow-xl overflow-hidden z-40">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">Verplaats naar</span>
            <button onClick={onClosePicker} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder)}
                className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
              >
                {folder.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-6">
        <ActionButton onClick={onDelete} disabled={disabled} color="red" label="Verwijderen">
          <TrashIcon />
        </ActionButton>
        <ActionButton onClick={onMove} disabled={disabled} color="yellow" label="Verplaatsen">
          <MoveIcon />
        </ActionButton>
        <ActionButton onClick={onKeep} disabled={disabled} color="green" label="Bewaren">
          <CheckIcon />
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({
  onClick, disabled, color, label, children,
}: {
  onClick: () => void
  disabled: boolean
  color: 'red' | 'green' | 'yellow'
  label: string
  children: React.ReactNode
}) {
  const colors = {
    red: 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border-red-500/30',
    green: 'bg-green-500/20 text-green-400 hover:bg-green-500/40 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 border-yellow-500/30',
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-16 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30 ${colors[color]}`}
      >
        {children}
      </button>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
