interface Props {
  currentThumb: string | null
  photoCount: number
  folderName: string
}

export default function PhotoStackLoader({ currentThumb, photoCount, folderName }: Props) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center gap-8">

      {/* Fotostapel */}
      <div aria-hidden="true" className="relative" style={{ width: 200, height: 200 }}>
        <div
          className="absolute inset-0 rounded-2xl bg-fluent-bg-hover"
          style={{ transform: 'rotate(-9deg) translate(-6px, 8px)', zIndex: 0 }}
        />
        <div
          className="absolute inset-0 rounded-2xl bg-fluent-border"
          style={{ transform: 'rotate(6deg) translate(5px, 5px)', zIndex: 1 }}
        />
        <div
          className="absolute inset-0 rounded-2xl bg-fluent-border-strong"
          style={{ transform: 'rotate(-3deg) translate(-2px, 2px)', zIndex: 2 }}
        />
        <div
          key={currentThumb ?? 'placeholder'}
          className="absolute inset-0 photo-land rounded-2xl overflow-hidden shadow-float"
          style={{ zIndex: 3 }}
        >
          {currentThumb ? (
            <img src={currentThumb} alt="" draggable={false} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full animate-pulse bg-fluent-bg-hover" />
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
