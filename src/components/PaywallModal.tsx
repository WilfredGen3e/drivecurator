interface Props {
  photosTriaged: number
  onBack: () => void
}

export default function PaywallModal({ photosTriaged, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white border border-fluent-border w-full max-w-md mx-4 p-8"
        style={{ borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-fluent-text-primary">DriveCurator</span>
        </div>

        {/* Icoon */}
        <div className="w-12 h-12 bg-fluent-accent-light rounded-sm flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-fluent-text-primary mb-2">
          Je gratis tegoed is op
        </h2>
        <p className="text-sm text-fluent-text-secondary mb-1 leading-relaxed">
          Je hebt {photosTriaged} foto's beoordeeld — dat is het gratis maximum van 200.
        </p>
        <p className="text-sm text-fluent-text-secondary mb-6 leading-relaxed">
          Met <strong className="text-fluent-text-primary">DriveCurator Premium</strong> ga je onbeperkt door. Geen limieten, gewoon lekker doorwerken aan je fotobak.
        </p>

        {/* Premium knop */}
        <button
          className="w-full bg-fluent-accent text-white text-sm font-semibold py-2.5 hover:bg-fluent-accent-hover transition-colors rounded-sm mb-3"
          onClick={() => alert('Betalingsintegratie komt binnenkort!')}
        >
          Upgrade naar Premium
        </button>

        {/* Terugknop */}
        <button
          onClick={onBack}
          className="w-full text-sm text-fluent-text-secondary py-2 hover:text-fluent-text-primary transition-colors"
        >
          Terug naar mappen
        </button>
      </div>
    </div>
  )
}
