interface Props {
  message: string
  onUndo: () => void
}

export default function UndoToast({ message, onUndo }: Props) {
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-fluent-text-primary text-white px-4 py-2.5 z-50 text-sm"
      style={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
    >
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="font-semibold text-fluent-accent-light hover:text-white transition-colors border-l border-white/20 pl-4"
      >
        Ongedaan maken
      </button>
    </div>
  )
}
