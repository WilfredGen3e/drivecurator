interface Props {
  folder: { id: string; name: string }
  photoCount: number
  onManual: () => void
  onSmartSort: () => void
  onChangeFolder: () => void
}

export default function OrganizeHome({ folder, photoCount, onManual, onSmartSort, onChangeFolder }: Props) {
  return (
    <div className="h-full flex flex-col bg-fluent-bg-secondary">

      {/* Map-header */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border)' }}
      >
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <span className="text-sm font-semibold text-fluent-text-primary truncate flex-1">{folder.name}</span>
        <span className="text-xs text-fluent-text-disabled flex-shrink-0 tabular-nums">
          {photoCount.toLocaleString('nl-NL')} foto's
        </span>
        <button
          onClick={onChangeFolder}
          className="text-xs font-semibold text-fluent-accent hover:text-fluent-accent-hover active:scale-[0.97] transition-all flex-shrink-0"
        >
          Wijzigen
        </button>
      </div>

      {/* Keuze */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-semibold text-fluent-text-primary mb-1 tracking-tight">Hoe wil je opschonen?</h1>
          <p className="text-fluent-text-secondary text-sm mb-7">
            Kies handmatig voor volledige controle, of slim sorteren voor automatische categorisering.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">

            {/* Handmatig */}
            <button
              onClick={onManual}
              className="group flex-1 text-left p-5 rounded-2xl bg-fluent-bg-primary border border-fluent-border shadow-card transition-all hover:shadow-float hover:-translate-y-0.5 active:scale-[0.99]"
            >
              {/* Icoon */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-fluent-accent-light text-fluent-accent">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>

              <p className="font-semibold text-fluent-text-primary mb-1.5">Handmatig organiseren</p>
              <p className="text-fluent-text-secondary text-sm leading-relaxed mb-5">
                Beoordeel foto's één voor één. Verwijder, bewaar of verplaats naar een andere map — in jouw eigen tempo.
              </p>

              <div className="flex items-center gap-1 text-xs font-semibold text-fluent-text-secondary group-hover:text-fluent-accent transition-colors">
                <span>Starten</span>
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Slim sorteren — aanbevolen */}
            <button
              onClick={onSmartSort}
              className="group flex-1 text-left p-5 rounded-2xl bg-fluent-bg-primary border border-fluent-accent shadow-card transition-all hover:shadow-float hover:-translate-y-0.5 active:scale-[0.99]"
            >
              {/* Icoon + badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-fluent-accent-light text-fluent-accent">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 flex-shrink-0 rounded-full bg-fluent-accent text-white">
                  Aanbevolen
                </span>
              </div>

              <p className="font-semibold text-fluent-text-primary mb-1.5">Slim sorteren</p>
              <p className="text-fluent-text-secondary text-sm leading-relaxed mb-5">
                De app herkent automatisch vakanties, schermafbeeldingen en meer. Verplaats alles in één keer per pakketje.
              </p>

              <div className="flex items-center gap-1 text-xs font-semibold text-fluent-accent">
                <span>Analyseren</span>
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
