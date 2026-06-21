interface Props {
  message: string
  onUndo: () => void
}

export default function UndoToast({ message, onUndo }: Props) {
  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 text-sm z-50 rounded-full shadow-float animate-rise"
      style={{
        background: 'var(--color-text-primary)',
        color: 'var(--color-bg-primary)',
        padding: '10px 18px',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{message}</span>
      <div style={{ width: 1, alignSelf: 'stretch', background: 'currentColor', opacity: 0.2 }} />
      <button
        onClick={onUndo}
        className="font-semibold transition-all hover:opacity-80 active:scale-95"
        style={{ color: 'var(--color-accent)' }}
      >
        Ongedaan maken
      </button>
    </div>
  )
}
