interface Props {
  message: string
  onUndo: () => void
}

export default function UndoToast({ message, onUndo }: Props) {
  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm z-50"
      style={{
        background: 'var(--color-text-primary)',
        color: '#fff',
        borderRadius: 2,
        boxShadow: '0 3px 12px rgba(0,0,0,0.28)',
        padding: '10px 16px',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{message}</span>
      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.2)' }} />
      <button
        onClick={onUndo}
        className="font-semibold transition-opacity hover:opacity-80"
        style={{ color: '#79c0ff' }}
      >
        Ongedaan maken
      </button>
    </div>
  )
}
