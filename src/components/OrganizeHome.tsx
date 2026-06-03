interface Props {
  folder: { id: string; name: string }
  photoCount: number
  onManual: () => void
  onSmartSort: () => void
  onChangeFolder: () => void
}

export default function OrganizeHome({ folder, photoCount, onManual, onSmartSort, onChangeFolder }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 bg-fluent-bg-secondary">
      <div className="w-full max-w-xl">
        {/* Geselecteerde map */}
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-4 h-4 text-fluent-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="text-sm font-semibold text-fluent-text-primary truncate">{folder.name}</span>
          <button
            onClick={onChangeFolder}
            className="text-xs text-fluent-accent hover:underline flex-shrink-0 ml-1"
          >
            Wijzigen
          </button>
          <span className="text-xs text-fluent-text-disabled ml-auto flex-shrink-0">
            {photoCount.toLocaleString('nl-NL')} foto's
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-fluent-text-primary mb-1">Kies aanvalsroute</h1>
        <p className="text-fluent-text-secondary text-sm mb-8">Hoe wil je de foto's in deze map opschonen?</p>

        <div className="flex flex-col sm:flex-row gap-4">

          {/* Handmatig organiseren */}
          <button
            onClick={onManual}
            className="flex-1 text-left bg-fluent-bg-primary border border-fluent-border hover:border-fluent-accent hover:bg-fluent-accent-light transition-colors p-5 group"
            style={{ borderRadius: 2 }}
          >
            <div className="mb-3">
              <svg className="w-8 h-8 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13l2 2 4-4" />
              </svg>
            </div>
            <p className="font-semibold text-fluent-text-primary text-base mb-1 group-hover:text-fluent-accent transition-colors">
              Handmatig organiseren
            </p>
            <p className="text-fluent-text-secondary text-sm">
              Beoordeel foto's één voor één. Verwijder, bewaar of verplaats naar een andere map.
            </p>
          </button>

          {/* Slim sorteren */}
          <button
            onClick={onSmartSort}
            className="flex-1 text-left bg-fluent-bg-primary border border-fluent-border hover:border-fluent-accent hover:bg-fluent-accent-light transition-colors p-5 group"
            style={{ borderRadius: 2 }}
          >
            <div className="mb-3">
              <svg className="w-8 h-8 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-semibold text-fluent-text-primary text-base mb-1 group-hover:text-fluent-accent transition-colors">
              Slim sorteren
            </p>
            <p className="text-fluent-text-secondary text-sm">
              De app herkent automatisch vakanties, schermafbeeldingen en meer. Verplaats alles in één keer per pakketje.
            </p>
          </button>

        </div>
      </div>
    </div>
  )
}
