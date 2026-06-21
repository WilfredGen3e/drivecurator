import Button from './ui/Button'

interface Props {
  onLogout: () => void
}

export default function BlockedScreen({ onLogout }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-fluent-bg-secondary px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-fluent-bg-primary shadow-float animate-rise">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-fluent-text-primary">DriveCurator</span>
        </div>

        <div className="w-12 h-12 flex items-center justify-center mb-5 rounded-xl bg-fluent-danger-light text-fluent-danger">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-fluent-text-primary mb-2">Account geblokkeerd</h2>
        <p className="text-sm text-fluent-text-secondary mb-6 leading-relaxed">
          Je account heeft momenteel geen toegang tot DriveCurator. Neem contact op met de beheerder om dit op te lossen.
        </p>

        <a
          href="mailto:stefansiemerink@outlook.com?subject=DriveCurator%20-%20Account%20geblokkeerd"
          className="flex items-center justify-center w-full min-h-[44px] rounded-xl bg-fluent-accent hover:bg-fluent-accent-hover text-white text-[15px] font-semibold transition-colors active:scale-[0.97] mb-2"
        >
          Neem contact op
        </a>

        <Button variant="ghost" fullWidth onClick={onLogout}>
          Uitloggen
        </Button>
      </div>
    </div>
  )
}
