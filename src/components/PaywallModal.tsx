import Button from './ui/Button'

interface Props {
  photosTriaged: number
  onBack: () => void
}

export default function PaywallModal({ photosTriaged, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-fluent-bg-primary shadow-float animate-rise">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-fluent-text-primary">DriveCurator</span>
        </div>

        {/* Icoon */}
        <div className="w-12 h-12 flex items-center justify-center mb-5 rounded-xl bg-fluent-accent-light text-fluent-accent">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-fluent-text-primary mb-2">Je gratis tegoed is op</h2>
        <p className="text-sm text-fluent-text-secondary mb-1 leading-relaxed">
          Je hebt {photosTriaged} foto's beoordeeld — dat is jouw huidige maximum.
        </p>
        <p className="text-sm text-fluent-text-secondary mb-6 leading-relaxed">
          Wil je meer foto's cureren? Neem contact op met de beheerder om je limiet te verhogen.
        </p>

        <a
          href="mailto:stefansiemerink@outlook.com?subject=DriveCurator%20-%20Limiet%20verhogen"
          className="flex items-center justify-center w-full min-h-[44px] rounded-xl bg-fluent-accent hover:bg-fluent-accent-hover text-white text-[15px] font-semibold transition-colors active:scale-[0.97] mb-2"
        >
          Neem contact op
        </a>

        <Button variant="ghost" fullWidth onClick={onBack}>
          Terug naar mappen
        </Button>
      </div>
    </div>
  )
}
