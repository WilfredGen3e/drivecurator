interface Props {
  onLogin: () => void
}

const features = [
  {
    title: 'Loop in je eigen tempo',
    description: 'Één foto groot op het scherm, jij beslist wat ermee gebeurt. Sluit af waar je wilt en pak later gewoon verder op.',
    icon: (
      <svg className="w-5 h-5 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Filter het kaf van het koren',
    description: 'Wazige foto\'s, screenshots, dubbele kiekjes — weg ermee. De bewaarders gaan direct naar de map die jij kiest.',
    icon: (
      <svg className="w-5 h-5 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Veilig verwijderen',
    description: 'Foto\'s die je weggooit gaan naar de OneDrive prullenbak, niet voorgoed weg. Terugzetten kan altijd nog.',
    icon: (
      <svg className="w-5 h-5 text-fluent-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
]

const steps = [
  {
    title: 'Log in met Microsoft',
    description: 'Verbind DriveCurator met je bestaande Microsoft account. Geen nieuw wachtwoord, geen extra account nodig.',
  },
  {
    title: 'Kies de map met je backup',
    description: 'Selecteer de map waar OneDrive je camerarol in heeft gezet — per maand gesorteerd of één grote vergaarbak.',
  },
  {
    title: 'Loop foto voor foto door je backup',
    description: 'Per foto beslissen: bewaren en naar een map, of weg. In je eigen tempo, zo lang als je wilt.',
  },
]

export default function LandingPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Navbar */}
      <nav className="border-b border-fluent-border bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="font-semibold text-fluent-text-primary">DriveCurator</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-sm px-4 py-1.5 border border-fluent-border-strong text-fluent-text-primary hover:bg-fluent-bg-hover transition-colors rounded-sm">
              Aanmelden
            </button>
            <button
              onClick={onLogin}
              className="text-sm px-4 py-1.5 bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors rounded-sm font-semibold"
            >
              Inloggen
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fluent-accent uppercase tracking-wide mb-3">
            OneDrive foto beheer
          </p>
          <h1 className="text-4xl font-semibold text-fluent-text-primary leading-tight mb-5">
            Breng orde in je<br />OneDrive fotobak.
          </h1>
          <p className="text-lg text-fluent-text-secondary mb-8 max-w-md leading-relaxed">
            OneDrive maakt automatisch een backup van je camerarol. Foto's stapelen zich op — per maand in een mapje, of in één grote vergaarbak. DriveCurator laat je er rustig doorheen lopen en alles opruimen.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="bg-fluent-accent text-white px-5 py-2.5 text-sm font-semibold hover:bg-fluent-accent-hover transition-colors rounded-sm"
            >
              Gratis beginnen met Microsoft
            </button>
            <span className="text-sm text-fluent-text-secondary">Geen account nodig</span>
          </div>
        </div>

        {/* App mockup */}
        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-md border border-fluent-border-strong rounded-sm overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            {/* App header */}
            <div className="h-10 bg-white border-b border-fluent-border flex items-center px-3 gap-2">
              <svg className="w-4 h-4 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-xs font-semibold text-fluent-text-primary">DriveCurator</span>
              <span className="ml-auto text-xs text-fluent-text-secondary">Stefan</span>
            </div>
            {/* App body */}
            <div className="flex" style={{ height: 260 }}>
              {/* Sidebar */}
              <div className="w-36 bg-fluent-bg-secondary border-r border-fluent-border p-2 flex flex-col gap-0.5 flex-shrink-0">
                <p className="text-xs text-fluent-text-disabled px-2 py-1 font-semibold uppercase tracking-wide">Mappen</p>
                {['Camera', '2024', 'Vakantie', 'Familie'].map((name, i) => (
                  <div
                    key={name}
                    className={`text-xs px-2 py-1 rounded-sm flex items-center gap-1.5 ${
                      i === 0
                        ? 'bg-fluent-accent-light text-fluent-accent font-semibold'
                        : 'text-fluent-text-secondary'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    {name}
                  </div>
                ))}
              </div>
              {/* Main area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Photo placeholder */}
                <div className="flex-1 bg-fluent-bg-secondary flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-28 h-20 bg-fluent-border-strong rounded-sm flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Photo info */}
                <div className="px-3 py-2 border-t border-fluent-border">
                  <p className="text-xs font-semibold text-fluent-text-primary">IMG_4521.jpg</p>
                  <p className="text-xs text-fluent-text-secondary">12 jan 2024 · 4.2 MB · 34 van 143</p>
                </div>
                {/* Action buttons */}
                <div className="flex border-t border-fluent-border">
                  <button className="flex-1 py-2 text-xs text-fluent-text-secondary hover:bg-fluent-bg-hover flex items-center justify-center gap-1 border-r border-fluent-border">
                    ← Vorige
                  </button>
                  <button className="flex-1 py-2 text-xs text-white bg-fluent-danger flex items-center justify-center gap-1 border-r border-fluent-border">
                    Verwijder
                  </button>
                  <button className="flex-1 py-2 text-xs text-white bg-fluent-accent flex items-center justify-center gap-1">
                    Volgende →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-fluent-bg-secondary border-t border-fluent-border py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-fluent-text-primary mb-10 text-center">
            Waarom DriveCurator?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white p-6 border border-fluent-border rounded-sm">
                <div className="w-10 h-10 bg-fluent-accent-light rounded-sm flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-fluent-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-fluent-text-secondary leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-fluent-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-fluent-text-primary mb-10 text-center">
            Hoe het werkt
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 bg-fluent-accent text-white rounded-sm flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-fluent-text-primary mb-1">{step.title}</h3>
                  <p className="text-sm text-fluent-text-secondary leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-fluent-accent-light border-t border-fluent-border py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold text-fluent-text-primary mb-3">
            Klaar om je fotobak op te ruimen?
          </h2>
          <p className="text-fluent-text-secondary mb-8">
            Log in met je Microsoft account en begin meteen. Gratis, geen installatie nodig.
          </p>
          <button
            onClick={onLogin}
            className="bg-fluent-accent text-white px-6 py-2.5 text-sm font-semibold hover:bg-fluent-accent-hover transition-colors rounded-sm"
          >
            Beginnen met Microsoft
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-fluent-border py-6 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-sm text-fluent-text-secondary">DriveCurator</span>
          </div>
          <span className="text-sm text-fluent-text-disabled">Werkt met Microsoft OneDrive via de Graph API</span>
        </div>
      </footer>
    </div>
  )
}
