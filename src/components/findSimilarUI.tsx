// Gedeelde UI voor "Vind vergelijkbare", herbruikbaar in elke triage-modus.
// De logica zit in de hook useFindSimilar; deze componenten zijn puur weergave.

// Knop + de twee gevoeligheidsschuiven (met hun ingestelde waarden) en de beste
// vorm/kleur van de laatste scan als houvast.
export function SimilarControls({
  onFind, disabled, showSliders,
  thresholdHash, setThresholdHash, thresholdColor, setThresholdColor, lastScan,
}: {
  onFind: () => void
  disabled: boolean
  showSliders: boolean
  thresholdHash: number
  setThresholdHash: (v: number) => void
  thresholdColor: number
  setThresholdColor: (v: number) => void
  lastScan: { bestHam: number; bestHist: number } | null
}) {
  return (
    <div className="flex flex-col items-center gap-2 mt-2.5">
      <button
        onClick={onFind}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-fluent-accent bg-fluent-accent-light hover:brightness-95 active:scale-[0.97] disabled:opacity-40 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
        Vind vergelijkbare
      </button>
      {showSliders && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-fluent-text-secondary">
          <label className="flex items-center gap-2">
            <span className="w-10 text-right">Vorm</span>
            <span className="text-fluent-text-disabled">Strikt</span>
            <input
              type="range" min={2} max={24} step={1} value={thresholdHash}
              onChange={e => setThresholdHash(+e.target.value)}
              className="accent-fluent-accent"
            />
            <span className="text-fluent-text-disabled">Ruim</span>
            <span className="tabular-nums font-semibold text-fluent-text-primary w-6 text-right">{thresholdHash}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-10 text-right">Kleur</span>
            <span className="text-fluent-text-disabled">Ruim</span>
            <input
              type="range" min={0.5} max={0.99} step={0.01} value={thresholdColor}
              onChange={e => setThresholdColor(+e.target.value)}
              className="accent-fluent-accent"
            />
            <span className="text-fluent-text-disabled">Strikt</span>
            <span className="tabular-nums font-semibold text-fluent-text-primary w-9 text-right">{thresholdColor.toFixed(2)}</span>
          </label>
        </div>
      )}
      {showSliders && lastScan && (
        <div className="text-[11px] text-fluent-text-secondary tabular-nums">
          Laatste scan · beste vorm: <span className="font-semibold text-fluent-text-primary">{lastScan.bestHam}</span>
          {' '}· beste kleur: <span className="font-semibold text-fluent-text-primary">{lastScan.bestHist.toFixed(3)}</span>
        </div>
      )}
    </div>
  )
}

// Donkere overlay met voortgang over de huidige foto tijdens een scan.
export function ScanOverlay({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <span className="text-white text-sm font-semibold">Vergelijkbare foto's zoeken…</span>
      <div className="w-full max-w-xs">
        <div className="h-[4px]" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <div className="h-full transition-all duration-200" style={{ width: `${progress}%`, background: 'var(--color-accent)' }} />
        </div>
        <div className="text-center text-white/70 text-xs mt-1 tabular-nums">{progress}%</div>
      </div>
      <button
        onClick={onCancel}
        className="px-5 py-2 text-sm font-semibold text-white border border-white/40 hover:bg-white/10 transition-colors"
        style={{ borderRadius: 10 }}
      >
        Annuleren
      </button>
    </div>
  )
}

// Klein wegklikbaar bannertje als een scan niets vond, met de dichtstbijzijnde
// waarden zodat de gebruiker de schuifjes gericht kan bijstellen.
export function NoMatchBanner({
  info, onClose,
}: {
  info: { scanned: number; bestHam: number; bestHist: number }
  onClose: () => void
}) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 flex items-center gap-3 px-4 py-2.5 shadow-lg"
      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-strong)', borderRadius: 12 }}
    >
      <div className="text-sm">
        <span className="font-semibold text-fluent-text-primary">Geen vergelijkbare gevonden</span>
        <span className="text-fluent-text-secondary">
          {' '}· {info.scanned} doorzocht · dichtstbij: vorm {info.bestHam}, kleur {info.bestHist.toFixed(2)}
        </span>
        <div className="text-xs text-fluent-text-secondary mt-0.5">
          Zet "Vorm" boven {info.bestHam} of "Kleur" onder {info.bestHist.toFixed(2)} en zoek opnieuw.
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-fluent-text-secondary hover:text-fluent-text-primary p-1 flex-shrink-0"
        title="Sluiten"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
