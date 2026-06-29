const STEPS = ['Kies een map', 'Kies aanvalsroute', 'Organiseren']

interface Props {
  current: number  // 1-based
}

export default function StepIndicator({ current }: Props) {
  const activeLabel = STEPS[Math.min(current, STEPS.length) - 1]

  return (
    <nav aria-label="Voortgang" className="border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0">

      {/* Mobiel/tablet (iPhone, iPad) — alleen de huidige stap */}
      <div className="flex lg:hidden items-center gap-2.5 px-5 py-2.5">
        <div aria-hidden="true" className="w-6 h-6 rounded-full bg-fluent-accent text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {current}
        </div>
        <span className="text-sm font-semibold text-fluent-text-primary flex-1 truncate">{activeLabel}</span>
        <span className="text-xs text-fluent-text-disabled flex-shrink-0 tabular-nums">Stap {current} van {STEPS.length}</span>
      </div>

      {/* Desktop — volledige stappenbalk */}
      <ol className="hidden lg:flex items-center px-6 py-2.5">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const done = stepNum < current
          const active = stepNum === current

          return (
            <li key={i} className="flex items-center" aria-current={active ? 'step' : undefined}>
              {i > 0 && (
                <div aria-hidden="true" className={`w-8 h-px mx-3 flex-shrink-0 ${done ? 'bg-fluent-accent' : 'bg-fluent-border-strong'}`} />
              )}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div aria-hidden="true" className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  done || active ? 'bg-fluent-accent text-white' : 'border border-fluent-border-strong text-fluent-text-disabled'
                }`}>
                  {done ? <CheckIcon /> : stepNum}
                </div>
                <span className={`text-sm ${
                  active ? 'font-semibold text-fluent-text-primary' :
                  done ? 'text-fluent-text-secondary' :
                  'text-fluent-text-disabled'
                }`}>
                  {label}
                </span>
                {done && <span className="sr-only"> (afgerond)</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}
