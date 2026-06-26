import { useState } from 'react'
import { branding } from '../branding'

interface Props {
  onLogin: () => Promise<void>
}

// Eén rustig, toegankelijk eyebrow-systeem (klein, hoofdletters, gespatieerd).
// Bewust secundair grijs i.p.v. accent: haalt WCAG AA op klein formaat en houdt
// de pagina kalm — de kleur-pop komt van knoppen, icoontegels en de foto's.
const eyebrow = 'text-xs font-semibold uppercase tracking-widest text-fluent-text-secondary'

// Sectiekop — consistente schaal + gebalanceerde regelafbreking.
const sectionHeading = 'text-3xl sm:text-4xl font-bold tracking-tight text-balance'

// Zichtbare focus-ring voor de eigen knoppen/links (zelfde patroon als Button.tsx).
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fluent-accent ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-fluent-bg-primary'

// ── App preview voor hero ─────────────────────────────────────────────────────

function TriagePreview() {
  return (
    <div className="relative w-full max-w-[340px] select-none mx-auto lg:mx-0">
      {/* Gestapelde kaarten achtergrond */}
      <div className="absolute inset-0 rounded-3xl bg-fluent-bg-secondary" style={{ transform: 'rotate(4deg) scale(0.94) translateY(6px)', opacity: 0.7 }} />
      <div className="absolute inset-0 rounded-3xl bg-fluent-bg-secondary" style={{ transform: 'rotate(2deg) scale(0.97) translateY(3px)' }} />

      {/* Hoofdkaart */}
      <div className="relative rounded-3xl overflow-hidden bg-fluent-bg-primary shadow-float border border-fluent-border">
        {/* Topbalk */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-fluent-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-fluent-accent" />
            <span className="text-xs font-medium text-fluent-text-secondary">Vakantiefoto's</span>
          </div>
          <span className="text-xs tabular-nums text-fluent-text-disabled">34 / 847</span>
        </div>

        {/* Voortgangsbalk */}
        <div className="h-[2px] bg-fluent-border">
          <div className="h-full bg-fluent-accent" style={{ width: '4%' }} />
        </div>

        {/* Foto-area */}
        <div
          className="relative h-48 flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #cfe0ff 0%, #9db8e8 60%, #6f8fc4 100%)' }}
        >
          <svg className="absolute bottom-0 left-0 right-0 w-full" height="64" viewBox="0 0 340 64" preserveAspectRatio="none">
            <path d="M0 64 L55 24 L110 44 L170 10 L230 38 L285 18 L340 32 L340 64 Z" fill="#5a78b0" opacity="0.7" />
            <path d="M0 64 L70 40 L150 52 L210 28 L270 48 L340 36 L340 64 Z" fill="#3f5a90" opacity="0.85" />
          </svg>

          {/* Swipe-links: verwijderen */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-fluent-danger-light">
            <svg className="w-3.5 h-3.5 text-fluent-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[10px] font-semibold text-fluent-danger">Weg</span>
          </div>

          {/* Swipe-rechts: bewaren */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-fluent-success-light">
            <span className="text-[10px] font-semibold text-fluent-success">Bewaren</span>
            <svg className="w-3.5 h-3.5 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Metadata + knoppen */}
        <div className="px-4 py-3 space-y-2.5 border-t border-fluent-border">
          <p className="text-[11px] text-fluent-text-disabled">IMG_4821.jpg · 14 augustus 2023 · 4.2 MB</p>
          <div className="flex gap-2">
            <div className="flex-1 py-2 rounded-xl text-center text-xs font-semibold bg-fluent-danger-light text-fluent-danger">Verwijderen</div>
            <div className="flex-1 py-2 rounded-xl text-center text-xs font-semibold bg-fluent-success-light text-fluent-success">Volgende →</div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Vakantie 2024', 'Camera roll', 'Familie'].map(name => (
              <span key={name} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-fluent-accent-light text-fluent-accent">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div
        className="absolute -top-3 -right-3 text-xs font-bold px-3 py-1.5 rounded-full text-white shadow-float"
        style={{ background: 'var(--color-accent)' }}
      >
        ✓ 613 foto's opgeslagen
      </div>
    </div>
  )
}

// ── Quotes ────────────────────────────────────────────────────────────────────

const userQuotes = [
  {
    text: '"How do I delete all OneDrive Photos? I have MANY duplicates."',
    source: 'Microsoft Q&A, 2024',
  },
  {
    text: '"I have 30K+ photos and recently paid for additional OneDrive space for this exact reason."',
    source: 'Microsoft Q&A gebruiker',
  },
  {
    text: '"Manually reviewing thousands of files can take hours, especially when duplicates are scattered across multiple folders."',
    source: 'Microsoft support forum',
  },
]

// ── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Triage in je eigen tempo',
    body: 'Eén foto groot op het scherm. Links verwijderen, rechts bewaren. Geen checkboxjes, geen gedoe. Ga door zo lang je wilt en stop waar je wilt — de app onthoudt waar je was.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Slim sorteren op rommel',
    body: 'Screenshots, burst-reeksen, WhatsApp-foto\'s en duplicaten worden automatisch herkend en gegroepeerd. Verplaats een hele categorie in één keer — zonder alles handmatig te doorzoeken.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Veilig verwijderen',
    body: 'Verwijderde foto\'s gaan naar de OneDrive prullenbak — niet voorgoed weg. Je kunt altijd terugzetten. Geen stress, geen mis-clicks waar je niet van terugkomt.',
  },
]

// ── Stappen ───────────────────────────────────────────────────────────────────

const steps = [
  {
    title: 'Log in met Microsoft',
    body: 'Verbind met je bestaande Microsoft account. Geen nieuw wachtwoord, geen extra account — dezelfde login als je al gebruikt voor OneDrive.',
  },
  {
    title: 'Kies de map met je backup',
    body: 'Selecteer de map waar OneDrive je camerarol in heeft gezet. Of laat de app automatisch analyseren welke categorieën er in zitten.',
  },
  {
    title: 'Loop door je foto\'s',
    body: 'Per foto beslissen: bewaren en naar een map, of weg. De rommel wordt automatisch voor je gegroepeerd. In je eigen tempo, zo lang als je wilt.',
  },
]

// ── Showcase (echte app-screenshots) ──────────────────────────────────────────

// Browservenster-frame rond een desktop-screenshot — geeft de beelden context
// en een verzorgde uitstraling.
function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-float border border-fluent-border bg-fluent-bg-primary">
      <div className="flex items-center gap-2 px-3.5 h-9 border-b border-fluent-border bg-fluent-bg-secondary">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <div className="mx-auto px-3 py-0.5 rounded-md text-[10px] text-fluent-text-disabled bg-fluent-bg-primary border border-fluent-border">
          drivecurator.app
        </div>
      </div>
      <img src={src} alt={alt} loading="lazy" className="w-full block" />
    </div>
  )
}

// Telefoon-frame rond de mobiele screenshot.
function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-[220px] rounded-[2.4rem] p-2 shadow-float" style={{ background: '#1c1c1e' }}>
      <div className="rounded-[1.9rem] overflow-hidden bg-black">
        <img src={src} alt={alt} loading="lazy" className="w-full block" />
      </div>
    </div>
  )
}

const showcaseRows = [
  {
    eyebrow: 'Handmatig organiseren',
    title: 'Eén foto, één beslissing',
    body: 'Elke foto groot in beeld met datum, camera en grootte. Links weg, rechts bewaren, of verplaats naar een map — met de muis, met sneltoetsen, of met een swipe. Geen checkboxjes, geen gepriegel.',
    src: '/screenshots/triage-desktop.png',
    alt: `${branding.name} triage-scherm: één foto groot in beeld met verwijder- en bewaarknoppen`,
  },
  {
    eyebrow: 'Slim sorteren',
    title: 'De rommel sorteert zichzelf',
    body: 'De app analyseert je hele map en groepeert automatisch: vakanties op locatie, screenshots, WhatsApp-foto\'s, burst-reeksen en duplicaten — elk met een teller. Verzet een hele categorie in één keer.',
    src: '/screenshots/smartsort-dashboard.png',
    alt: `${branding.name} slim-sorteren-dashboard met categorieën en aantallen`,
  },
  {
    eyebrow: 'In één oogopslag',
    title: 'Hele reeksen tegelijk',
    body: 'Open een groep en zie alle foto\'s naast elkaar. Bewaar de beste, gooi de rest weg, of verplaats de hele set — zonder eindeloos te scrollen.',
    src: '/screenshots/smartsort-cluster.png',
    alt: `${branding.name} cluster-grid met meerdere foto's naast elkaar`,
  },
]

function Showcase() {
  return (
    <section className="border-t border-fluent-border">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <p className={`${eyebrow} mb-3 text-center`}>
          Zie het zelf
        </p>
        <h2 className={`${sectionHeading} text-center mb-4`}>
          Zo ziet opruimen eruit
        </h2>
        <p className="text-base text-center max-w-xl mx-auto mb-16 text-fluent-text-secondary">
          Geen verrassingen achter de login. Dit is precies wat je krijgt.
        </p>

        <div className="space-y-20">
          {showcaseRows.map((row, i) => (
            <div
              key={row.title}
              className={`flex flex-col gap-8 lg:gap-12 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}
            >
              <div className="flex-1 w-full">
                <BrowserFrame src={row.src} alt={row.alt} />
              </div>
              <div className="flex-1 max-w-md">
                <p className={`${eyebrow} mb-3`}>{row.eyebrow}</p>
                <h3 className="text-2xl sm:text-[1.75rem] font-bold mb-3 tracking-tight text-balance">{row.title}</h3>
                <p className="text-base leading-relaxed text-fluent-text-secondary">{row.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobiel-accent */}
        <div className="mt-20 rounded-3xl bg-fluent-bg-secondary px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-10 max-w-4xl mx-auto">
            <PhoneFrame src="/screenshots/triage-mobile.png" alt={`${branding.name} op een telefoon, met grote touch-knoppen`} />
            <div className="flex-1 text-center md:text-left">
              <p className={`${eyebrow} mb-3`}>Ook op je telefoon</p>
              <h3 className="text-2xl sm:text-[1.75rem] font-bold mb-3 tracking-tight text-balance">Opruimen vanaf de bank</h3>
              <p className="text-base leading-relaxed text-fluent-text-secondary">
                Op mobiel krijg je een touch-layout met grote knoppen en swipe-gebaren. Installeer {branding.name} als
                app op je beginscherm en ruim je camerarol op waar en wanneer je wilt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Microsoft login knop ──────────────────────────────────────────────────────

function MsftButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`group flex items-center justify-center gap-3 px-6 rounded-xl font-semibold text-[15px] text-white transition-all duration-200 disabled:opacity-60 active:scale-[0.97] hover:brightness-110 ${focusRing}`}
      style={{ background: 'var(--color-accent)', minHeight: 50 }}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 21 21" fill="none" style={{ flexShrink: 0 }}>
          <rect x="0" y="0" width="10" height="10" fill="#F25022" />
          <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
          <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
          <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
        </svg>
      )}
      {loading ? 'Aanmelden…' : 'Beginnen met Microsoft'}
    </button>
  )
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage({ onLogin }: Props) {
  const [loggingIn, setLoggingIn] = useState(false)

  const handleLogin = async () => {
    setLoggingIn(true)
    try { await onLogin() } finally { setLoggingIn(false) }
  }

  return (
    <div className="bg-fluent-bg-primary text-fluent-text-primary">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b border-fluent-border"
        style={{ background: 'color-mix(in srgb, var(--color-bg-primary) 80%, transparent)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="font-semibold text-sm tracking-tight">{branding.name}</span>
          </div>
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className={`text-sm font-semibold px-4 py-2 rounded-full bg-fluent-accent-light text-fluent-accent transition-all duration-200 active:scale-[0.97] hover:brightness-95 disabled:opacity-60 ${focusRing}`}
          >
            {loggingIn ? 'Aanmelden…' : 'Aanmelden'}
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Zachte achtergrond-glow */}
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[400px] opacity-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, var(--color-accent-light) 0%, transparent 70%)', transform: 'translate(-50%, -20%)' }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Linker kolom: tekst */}
            <div className="flex-1 max-w-xl animate-rise">
              <p className={`${eyebrow} mb-5`}>{branding.slogan}</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-6 tracking-tight text-balance">
                Je OneDrive staat vol.
                <br />
                <span className="text-fluent-text-secondary">En je weet precies hoe dat is gekomen.</span>
              </h1>
              <p className="text-lg mb-8 leading-relaxed text-fluent-text-secondary text-pretty">
                OneDrive heeft jarenlang automatisch je camerarol opgeslagen. Nu heb je duizenden foto's —
                screenshots, dubbelingen, WhatsApp-rotzooi — en geen fatsoenlijk gereedschap om er doorheen te komen.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <MsftButton onClick={handleLogin} loading={loggingIn} />
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fluent-text-secondary">
                  {['Gratis', "200 foto's", 'Geen installatie'].map(item => (
                    <li key={item} className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 flex-shrink-0 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Rechter kolom: app preview */}
            <div className="flex-1 flex justify-center lg:justify-end w-full animate-rise" style={{ animationDelay: '0.1s' }}>
              <TriagePreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote strip ──────────────────────────────────────────────────── */}
      <div className="border-y border-fluent-border bg-fluent-bg-secondary">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <p className={`${eyebrow} mb-6 text-center`}>
            Wat gebruikers zeggen op Microsoft forums
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userQuotes.map((q, i) => (
              <div key={i} className="p-5 rounded-2xl bg-fluent-bg-primary shadow-card border-l-[3px] border-fluent-accent transition-all duration-200 hover:shadow-float hover:-translate-y-0.5">
                <p className="text-sm leading-relaxed mb-3 text-fluent-text-primary">{q.text}</p>
                <p className="text-xs text-fluent-text-secondary">— {q.source}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Verhaal ───────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="space-y-6 text-base leading-relaxed text-fluent-text-secondary">
          <h2 className={`${sectionHeading} mb-8 text-fluent-text-primary`}>
            Het probleem is niet de backup.<br />Het is wat daarna komt.
          </h2>

          <p>
            Microsoft's automatische camera-backup doet zijn werk stilletjes, jaar na jaar.
            Totdat je merkt dat je 11.000 foto's hebt staan en je opslaglimiet vol zit.
            Je koopt meer opslag — voor foto's die je eigenlijk helemaal niet wilt bewaren.
          </p>

          <p>
            Microsoft's eigen fotobeheer vraagt je om foto's te selecteren via kleine checkboxjes.
            Eén voor één, of met Ctrl+A als je geluk hebt. Het is frustrerend, het duurt uren,
            en de meeste mensen haken na de eerste honderd foto's al af. De berg groeit.
          </p>

          <blockquote className="my-8 pl-5 py-1 border-l-[3px] border-fluent-accent text-fluent-text-primary italic" style={{ fontSize: '1.1rem' }}>
            "OneDrive camera backup puts all photos together with no option to change this."
            <footer className="mt-2 text-sm not-italic text-fluent-text-secondary">— Microsoft Q&A, Android gebruiker</footer>
          </blockquote>

          <p>
            Ondertussen staan je <em className="not-italic font-semibold text-fluent-text-primary">échte foto's</em> er ook bij.
            Ergens tussen de 47 bijna-identieke foto's van hetzelfde uitzicht, de screenshot van een
            parkeerbon uit 2021 en de WhatsApp-video die iemand in de groepsapp gooide — zitten de
            foto's die je wél wilt bewaren. Maar je kunt er niet bij.
          </p>

          <p>
            {branding.name} lost dit op met één simpel principe: één foto groot op het scherm,
            jij beslist wat ermee gebeurt. De app herkent automatisch je screenshots, burst-reeksen
            en WhatsApp-foto's — zodat je die categorie in één keer kunt wegzetten zonder alles te
            hoeven bekijken.
          </p>
        </div>
      </section>

      {/* ── Showcase (echte screenshots) ──────────────────────────────────── */}
      <Showcase />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="border-t border-fluent-border bg-fluent-bg-secondary">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <p className={`${eyebrow} mb-3 text-center`}>
            Hoe het werkt
          </p>
          <h2 className={`${sectionHeading} text-center mb-12`}>
            Waarom {branding.name} anders is
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-fluent-bg-primary shadow-card transition-all duration-200 hover:shadow-float hover:-translate-y-0.5"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-fluent-accent-light text-fluent-accent">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed text-fluent-text-secondary">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stappen ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <p className={`${eyebrow} mb-3 text-center`}>
          Aan de slag
        </p>
        <h2 className={`${sectionHeading} text-center mb-12`}>
          In drie stappen je fotobak op orde
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5 bg-fluent-accent text-white">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm leading-relaxed text-fluent-text-secondary">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gratis plan callout ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-8 bg-fluent-accent-light">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <p className={`${eyebrow} mb-3`}>Gratis plan</p>
              <ul className="space-y-2.5">
                {[
                  '200 foto\'s cureren — bewaren of verwijderen',
                  'Slim sorteren: screenshots, duplicaten en WhatsApp automatisch herkend',
                  'Foto\'s gaan naar de OneDrive prullenbak — niet voorgoed weg',
                  'Geen installatie — werkt direct in de browser',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-fluent-text-primary">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-fluent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-4 text-fluent-text-secondary">Meer nodig? Neem contact op voor een uitgebreid plan.</p>
            </div>
            <div className="flex-shrink-0">
              <MsftButton onClick={handleLogin} loading={loggingIn} />
              <p className="text-xs mt-3 text-center text-fluent-text-secondary">Werkt met elk Microsoft account</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-fluent-border bg-fluent-bg-secondary">
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className={`${sectionHeading} mb-4`}>
            Hoeveel foto's staan er bij jou al jaren onbekeken?
          </h2>
          <p className="text-base mb-10 max-w-xl mx-auto text-fluent-text-secondary">
            Log in met je Microsoft account en kijk het na. Gratis, direct, geen nieuw wachtwoord nodig.
          </p>
          <div className="flex justify-center">
            <MsftButton onClick={handleLogin} loading={loggingIn} />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-fluent-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-sm font-medium text-fluent-text-secondary">{branding.name}</span>
          </div>
          <span className="text-sm text-fluent-text-secondary">
            Werkt met Microsoft OneDrive via de Graph API
          </span>
        </div>
      </footer>
    </div>
  )
}
