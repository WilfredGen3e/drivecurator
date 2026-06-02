interface Props {
  onManual: () => void
  onSmartSort: () => void
}

export default function OrganizeHome({ onManual, onSmartSort }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 bg-fluent-bg-secondary">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-fluent-text-primary mb-1">Begin met organiseren</h1>
        <p className="text-fluent-text-secondary text-sm mb-8">Kies hoe je je OneDrive foto's wilt opschonen.</p>

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
              Kies een map en beoordeel foto's één voor één. Verwijder, bewaar of verplaats naar een andere map.
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
