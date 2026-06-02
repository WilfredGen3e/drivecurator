interface Props {
  onManual: () => void
}

export default function OrganizeHome({ onManual }: Props) {
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

          {/* Placeholder tweede functie */}
          <div
            className="flex-1 text-left bg-fluent-bg-primary border border-fluent-border p-5 opacity-50 cursor-not-allowed select-none"
            style={{ borderRadius: 2 }}
          >
            <div className="mb-3">
              <svg className="w-8 h-8 text-fluent-text-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="font-semibold text-fluent-text-secondary text-base mb-1">
              Binnenkort beschikbaar
            </p>
            <p className="text-fluent-text-disabled text-sm">
              Een nieuwe manier om je foto's te organiseren. Komt binnenkort.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
