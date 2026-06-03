interface Props {
  currentThumb: string | null
  photoCount: number
  folderName: string
}

export default function PhotoStackLoader({ currentThumb, photoCount, folderName }: Props) {
  return (
    <div className="flex flex-col items-center gap-8">

      {/* Stapel */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        {/* Decoratieve achtergrondkaarten */}
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(-9deg) translate(-6px, 8px)', background: '#c8c6c4', borderRadius: 2, zIndex: 0 }}
        />
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(6deg) translate(5px, 5px)', background: '#d2d0ce', borderRadius: 2, zIndex: 1 }}
        />
        <div
          className="absolute inset-0"
          style={{ transform: 'rotate(-3deg) translate(-2px, 2px)', background: '#edebe9', borderRadius: 2, zIndex: 2 }}
        />

        {/* Bovenste kaart: animatie bij elke nieuwe foto */}
        <div
          key={currentThumb ?? 'placeholder'}
          className="absolute inset-0 photo-land"
          style={{ zIndex: 3, borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
        >
          {currentThumb ? (
            <img
              src={currentThumb}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-fluent-bg-hover animate-pulse" />
          )}
        </div>
      </div>

      {/* Teller + mapnaam */}
      <div className="text-center space-y-1">
        <p className="text-fluent-text-primary">
          {photoCount > 0 ? (
            <>
              <span className="text-2xl font-semibold text-fluent-accent tabular-nums">
                {photoCount.toLocaleString('nl-NL')}
              </span>
              <span className="text-sm text-fluent-text-secondary ml-2">foto's geladen</span>
            </>
          ) : (
            <span className="text-sm text-fluent-text-secondary">Verbinding maken…</span>
          )}
        </p>
        <p className="text-fluent-text-disabled text-xs truncate max-w-xs">uit "{folderName}"</p>
      </div>

    </div>
  )
}
