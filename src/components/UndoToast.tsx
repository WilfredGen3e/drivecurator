interface Props {
  message: string
  onUndo: () => void
}

export default function UndoToast({ message, onUndo }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-800 text-white px-5 py-3 rounded-full shadow-lg z-50">
      <span className="text-sm">{message}</span>
      <button onClick={onUndo} className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
        Ongedaan maken
      </button>
    </div>
  )
}
