const STEPS = ['Kies een map', 'Kies aanvalsroute', 'Organiseren']

interface Props {
  current: number  // 1-based
}

export default function StepIndicator({ current }: Props) {
  return (
    <div className="flex items-center px-6 py-2.5 border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const done = stepNum < current
        const active = stepNum === current

        return (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <div className={`w-8 h-px mx-3 flex-shrink-0 ${done ? 'bg-fluent-accent' : 'bg-fluent-border-strong'}`} />
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                done || active ? 'bg-fluent-accent text-white' : 'border border-fluent-border-strong text-fluent-text-disabled'
              }`} style={{ borderRadius: '50%' }}>
                {done ? <CheckIcon /> : stepNum}
              </div>
              <span className={`text-sm ${
                active ? 'font-semibold text-fluent-text-primary' :
                done ? 'text-fluent-text-secondary' :
                'text-fluent-text-disabled'
              }`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}
