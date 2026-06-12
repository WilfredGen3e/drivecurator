interface Props {
  currentThumb: string | null
  photoCount: number
  folderName: string
}

export default function PhotoStackLoader({ currentThumb, photoCount, folderName }: Props) {
  return (
    <div className="flex flex-col items-center gap-8">

      {/* Fotostapel */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(-9deg) translate(-6px, 8px)', background: '#1a1a20', borderRadius: 2, zIndex: 0 }}
        />
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(6deg) translate(5px, 5px)', background: '#22222a', borderRadius: 2, zIndex: 1 }}
        />
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(-3deg) translate(-2px, 2px)', background: '#2a2a34', borderRadius: 2, zIndex: 2 }}
        />
        <div
          key={currentThumb ?? 'placeholder'}
          className="absolute inset-0 photo-land"
          style={{ zIndex: 3, borderRadius: 2, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}
        >
          {currentThumb ? (
            <img src={currentThumb} alt="" draggable={false} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full animate-pulse" style={{ background: '#1e1e26' }} />
          )}
        </div>
      </div>

      {/* Teller + mapnaam */}
      <div className="text-center space-y-1">
        <p className="text-fluent-text-primary">
          {photoCount > 0 ? (
            <>
              <span className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                {photoCount.toLocaleString('nl-NL')}
              </span>
              <span className="text-sm text-fluent-text-secondary ml-2">foto's geladen</span>
            </>
          ) : (
            <span className="text-sm text-fluent-text-secondary">Verbinding maken…</span>
          )}
        </p>
        <p className="text-fluent-text-disabled text-xs truncate max-w-xs">uit &ldquo;{folderName}&rdquo;</p>
      </div>

    </div>
  )
}
