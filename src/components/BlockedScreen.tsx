interface Props {
  onLogout: () => void
}

export default function BlockedScreen({ onLogout }: Props) {
  return (
    <div className="min-h-screen bg-fluent-bg-secondary flex items-center justify-center">
      <div
        className="bg-white border border-fluent-border w-full max-w-md mx-4 p-8"
        style={{ borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-fluent-text-primary">DriveCurator</span>
        </div>

        <div className="w-12 h-12 bg-fluent-danger-light rounded-sm flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-fluent-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-fluent-text-primary mb-2">
          Account geblokkeerd
        </h2>
        <p className="text-sm text-fluent-text-secondary mb-6 leading-relaxed">
          Je account heeft momenteel geen toegang tot DriveCurator. Neem contact op met de beheerder om dit op te lossen.
        </p>

        <a
          href="mailto:stefansiemerink@outlook.com?subject=DriveCurator%20-%20Account%20geblokkeerd"
          className="block w-full bg-fluent-accent text-white text-sm font-semibold py-2.5 text-center hover:bg-fluent-accent-hover transition-colors rounded-sm mb-3"
        >
          Neem contact op
        </a>

        <button
          onClick={onLogout}
          className="w-full text-sm text-fluent-text-secondary py-2 hover:text-fluent-text-primary transition-colors"
        >
          Uitloggen
        </button>
      </div>
    </div>
  )
}
