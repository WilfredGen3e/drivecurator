interface Props {
  onLogin: () => Promise<void>
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
          <button
            onClick={onLogin}
            className="text-sm px-4 py-1.5 bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors rounded-sm font-semibold"
          >
            Aanmelden
          </button>
        </div>
      </nav>

      {/* Hero — gecentreerd */}
      <section className="max-w-2xl mx-auto px-6 pt-24 pb-16 text-center">
        <p className="text-sm font-semibold text-fluent-accent uppercase tracking-wide mb-4">
          OneDrive foto beheer
        </p>
        <h1 className="text-4xl font-semibold text-fluent-text-primary leading-tight mb-5">
          Breng orde in je<br />OneDrive fotobak.
        </h1>
        <p className="text-lg text-fluent-text-secondary mb-10 leading-relaxed">
          OneDrive maakt automatisch een backup van je camerarol. Foto's stapelen zich op.
          DriveCurator laat je er rustig doorheen lopen en alles opruimen — foto voor foto.
        </p>

        {/* Free plan callout */}
        <div className="border border-fluent-border bg-fluent-bg-secondary rounded-sm p-6 mb-8 text-left">
          <p className="text-xs font-semibold text-fluent-accent uppercase tracking-wide mb-3">Gratis plan</p>
          <ul className="space-y-2 mb-4">
            {[
              '200 foto\'s cureren — bewaren of verwijderen',
              'Foto\'s gaan naar de OneDrive prullenbak, niet voorgoed weg',
              'Mappen aanmaken en foto\'s direct verplaatsen',
              'Geen installatie — werkt in de browser',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-fluent-text-primary">
                <svg className="w-4 h-4 text-fluent-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-fluent-text-secondary">Meer nodig? Neem contact op voor een uitgebreid plan.</p>
        </div>

        {/* CTA */}
        <button
          onClick={onLogin}
          className="flex items-center gap-3 mx-auto bg-fluent-accent text-white px-7 py-3 text-base font-semibold hover:bg-fluent-accent-hover transition-colors rounded-sm"
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
            <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          </svg>
          Aanmelden met Microsoft
        </button>
        <p className="text-xs text-fluent-text-secondary mt-3">
          Je bestaande Microsoft account — geen nieuw wachtwoord nodig.
        </p>
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
