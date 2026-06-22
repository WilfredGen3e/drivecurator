import { useEffect, useRef, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { msalConfig } from './auth/msalConfig'
import LandingPage from './components/LandingPage'
import OrganizeHome from './components/OrganizeHome'
import SmartSortView from './components/SmartSortView'
import FolderBrowser from './components/FolderBrowser'
import TriageView from './components/TriageView'
import BlockedScreen from './components/BlockedScreen'
import AdminPortal from './components/AdminPortal'
import StepIndicator from './components/StepIndicator'
import PhotoStackLoader from './components/PhotoStackLoader'
import { useAppStore } from './store/useAppStore'
import { registerUser, AccountBlockedError } from './services/apiService'
import { getFolderContents, DriveItem } from './services/graphService'
import { AnalysisResult } from './services/analysisService'
import { installGlobalErrorLogging, logInfo, logWarn, logError, createLogger } from './services/logService'

const authLog = createLogger('auth')

const msalInstance = new PublicClientApplication(msalConfig)

// ── Session cache ────────────────────────────────────────────────────────────
const SESSION_KEY = 'drivecurator_session'
const SESSION_TTL = 6 * 60 * 60 * 1000 // 6 uur

const LAST_FOLDER_KEY = 'drivecurator_last_folder'
function saveLastFolder(folder: { id: string; name: string }) {
  try { localStorage.setItem(LAST_FOLDER_KEY, JSON.stringify(folder)) } catch { /* vol */ }
}

interface SessionData {
  folder: { id: string; name: string }
  photos: DriveItem[]
  ts: number
}

function saveSession(folder: { id: string; name: string }, photos: DriveItem[]) {
  // Thumbnails worden bewust niet opgeslagen: Graph-URLs verlopen na ~1 uur,
  // maar de sessie leeft 6 uur. TriageView haalt thumbnails on-demand opnieuw op.
  const slim = photos.map(({ thumbnails: _t, ...rest }) => rest)
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ folder, photos: slim, ts: Date.now() }))
  } catch { /* sessionStorage vol, skip */ }
}

function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data: SessionData = JSON.parse(raw)
    if (Date.now() - data.ts > SESSION_TTL) { sessionStorage.removeItem(SESSION_KEY); return null }
    return data
  } catch { return null }
}

function clearSession() { sessionStorage.removeItem(SESSION_KEY) }

export default function App() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [showApp, setShowApp] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [screen, setScreen] = useState<'browse' | 'loading' | 'organize' | 'smart-sort'>('browse')
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null)
  const [loadedPhotos, setLoadedPhotos] = useState<DriveItem[]>([])
  const [photoLoadCount, setPhotoLoadCount] = useState(0)
  const [currentThumb, setCurrentThumb] = useState<string | null>(null)

  // Voorkomt dat pagina's van een oude mapkeuze binnenkomen terwijl de gebruiker
  // al een andere map heeft geselecteerd (race condition bij snelle navigatie).
  const folderRequestId = useRef(0)

  // Analyseresultaat cachen zodat "Terug → OrganizeHome → Slim sorteren" de
  // analyse niet opnieuw uitvoert voor dezelfde map.
  const smartSortCache = useRef<{ folderId: string; result: AnalysisResult } | null>(null)

  const {
    reset, currentFolderId, loading,
    setCurrentUser, currentUser,
    setFolder, setPhotos, setFullyLoaded,
  } = useAppStore()

  const handleRegistration = async (acc: AccountInfo) => {
    try {
      const user = await registerUser(msalInstance, acc)
      setCurrentUser(user)
      authLog.info(`Geregistreerd/ingelogd: ${user.email}`, {
        premium: user.isPremium,
        admin: user.isAdmin,
        getrieerd: user.photosTriaged,
      })
    } catch (e) {
      if (e instanceof AccountBlockedError) {
        authLog.warn(`Account geblokkeerd: ${acc.username}`)
        setBlocked(true)
      } else {
        authLog.error('Registratie mislukt', e)
      }
    }
  }

  useEffect(() => {
    installGlobalErrorLogging()
    msalInstance.initialize().then(async () => {
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        setAccount(accounts[0])
        setShowApp(true)
        await handleRegistration(accounts[0])
        // Herstel sessie bij page refresh
        const cached = loadSession()
        if (cached) {
          setSelectedFolder(cached.folder)
          setLoadedPhotos(cached.photos)
          setScreen('organize')
        }
      }
      setInitializing(false)
    })
  }, [])

  const handleLogout = () => {
    authLog.info('Uitloggen gestart')
    msalInstance.logoutPopup().then(() => {
      authLog.info('Uitgelogd')
      clearSession()
      setAccount(null)
      setCurrentUser(null)
      reset()
      setShowApp(false)
      setBlocked(false)
      setSelectedFolder(null)
      setLoadedPhotos([])
      setCurrentThumb(null)
      setScreen('browse')
    })
  }

  const handleFolderSelected = async (folder: { id: string; name: string }) => {
    if (!account) return
    const requestId = ++folderRequestId.current
    setSelectedFolder(folder)
    setLoadedPhotos([])
    setPhotoLoadCount(0)
    setCurrentThumb(null)
    setScreen('loading')

    logInfo(`Map laden gestart: "${folder.name}"`, { id: folder.id })
    const allPhotos: DriveItem[] = []
    let nextLogAt = 2000
    try {
      await getFolderContents(msalInstance, account, folder.id, (page) => {
        if (folderRequestId.current !== requestId) return
        allPhotos.push(...page)
        setPhotoLoadCount(allPhotos.length)
        if (allPhotos.length >= nextLogAt) {
          logInfo(`Map laden: ${allPhotos.length} foto's tot nu toe…`)
          nextLogAt += 2000
        }
        const thumb = page.find(p => p.thumbnails?.[0]?.medium?.url)?.thumbnails?.[0]?.medium?.url
        if (thumb) setCurrentThumb(thumb)
      })
      if (folderRequestId.current !== requestId) {
        logWarn(`Map laden afgebroken bij ${allPhotos.length} foto's (andere map gekozen): "${folder.name}"`)
        return
      }
      setLoadedPhotos(allPhotos)
      setCurrentThumb(null)
      saveSession(folder, allPhotos)
      saveLastFolder(folder)
      setScreen('organize')
      logInfo(`Map geladen: "${folder.name}" — ${allPhotos.length} foto's`)
    } catch (e) {
      if (folderRequestId.current !== requestId) return
      logError(`Map laden mislukt: "${folder.name}" na ${allPhotos.length} foto's`, e)
      setScreen('browse')
    }
  }

  const handleStartManual = () => {
    if (!selectedFolder || loadedPhotos.length === 0) return
    setFolder(selectedFolder.id, selectedFolder.name)
    setPhotos(loadedPhotos)
    setFullyLoaded(true)
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-fluent-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (blocked) {
    return <BlockedScreen onLogout={handleLogout} />
  }

  const handleLogin = async () => {
    authLog.info('Inloggen gestart')
    try {
      const { loginRequest } = await import('./auth/msalConfig')
      const result = await msalInstance.loginPopup(loginRequest)
      if (result?.account) {
        authLog.info(`Ingelogd: ${result.account.username}`)
        setAccount(result.account)
        setShowApp(true)
        await handleRegistration(result.account)
      }
    } catch (e) {
      authLog.warn('Inloggen afgebroken of mislukt', e)
    }
  }

  if (!showApp || !account) {
    return <LandingPage onLogin={handleLogin} />
  }

  const currentStep = (currentFolderId || screen === 'smart-sort') ? 3
                    : (screen === 'organize' || screen === 'loading') ? 2
                    : 1

  return (
    <div className="h-screen bg-fluent-bg-primary text-fluent-text-primary flex flex-col">
      <header className="flex items-center justify-between px-4 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0 h-12">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-sm">DriveCurator</span>
          <span className="text-[10px] text-fluent-text-secondary font-mono" title="Buildnummer">{__BUILD_ID__}</span>
        </div>
        {/* Desktop — volledige header (geen ruimtegebrek hier) */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-fluent-text-secondary text-sm">{account.name}</span>
          {(currentUser?.isAdmin || import.meta.env.DEV) && (
            <button
              onClick={() => setShowAdmin(v => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                showAdmin
                  ? 'text-fluent-accent bg-fluent-accent-light'
                  : 'text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover'
              }`}
            >
              Beheer
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-fluent-text-secondary hover:text-fluent-text-primary px-3 py-1.5 rounded-lg hover:bg-fluent-bg-hover transition-colors"
          >
            Uitloggen
          </button>
        </div>

        {/* Mobiel/tablet (iPhone, iPad) — account-menu (avatar → dropdown) */}
        <div className="relative flex-shrink-0 lg:hidden">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-fluent-bg-hover active:scale-[0.97] transition-all"
            title={account.name ?? 'Account'}
          >
            <span className="w-8 h-8 rounded-full bg-fluent-accent-light text-fluent-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {(account.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <svg className={`w-4 h-4 text-fluent-text-secondary transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-60 z-50 rounded-2xl bg-fluent-bg-primary shadow-float border border-fluent-border overflow-hidden animate-rise">
                <div className="px-4 py-3 border-b border-fluent-border">
                  <p className="text-sm font-semibold text-fluent-text-primary truncate">{account.name}</p>
                  {account.username && (
                    <p className="text-xs text-fluent-text-secondary truncate">{account.username}</p>
                  )}
                </div>
                {/* In dev-modus draait de API-backend meestal niet (currentUser blijft
                    leeg), maar het Logboek is client-side — dus toon de knop dan altijd. */}
                {(currentUser?.isAdmin || import.meta.env.DEV) && (
                  <button
                    onClick={() => { setShowAdmin(v => !v); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-fluent-bg-hover transition-colors"
                  >
                    <svg className="w-4 h-4 text-fluent-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-fluent-text-primary">{showAdmin ? 'Beheer sluiten' : 'Beheer'}</span>
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); handleLogout() }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-fluent-danger hover:bg-fluent-danger-light transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Uitloggen
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {!showAdmin && <StepIndicator current={currentStep} />}

      <main className="flex-1 min-h-0">
        {showAdmin ? (
          <AdminPortal msalInstance={msalInstance} account={account} onClose={() => setShowAdmin(false)} />
        ) : screen === 'loading' ? (
          <div className="h-full flex items-center justify-center bg-fluent-bg-secondary">
            <PhotoStackLoader
              currentThumb={currentThumb}
              photoCount={photoLoadCount}
              folderName={selectedFolder?.name ?? ''}
            />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-7 h-7 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-fluent-text-secondary text-sm">Eerste foto's laden…</p>
          </div>
        ) : currentFolderId ? (
          <TriageView
            msalInstance={msalInstance}
            account={account}
            onBack={() => { reset(); setScreen('organize') }}
          />
        ) : screen === 'smart-sort' && selectedFolder ? (
          <SmartSortView
            msalInstance={msalInstance}
            account={account}
            folder={selectedFolder}
            initialPhotos={loadedPhotos}
            cachedResult={smartSortCache.current?.folderId === selectedFolder.id ? smartSortCache.current.result : null}
            onResult={(r) => { smartSortCache.current = { folderId: selectedFolder.id, result: r } }}
            onBack={() => setScreen('organize')}
          />
        ) : screen === 'organize' && selectedFolder ? (
          <OrganizeHome
            folder={selectedFolder}
            photoCount={loadedPhotos.length}
            onManual={handleStartManual}
            onSmartSort={() => setScreen('smart-sort')}
            onChangeFolder={() => setScreen('browse')}
          />
        ) : (
          <FolderBrowser
            msalInstance={msalInstance}
            account={account}
            onFolderSelected={handleFolderSelected}
          />
        )}
      </main>
    </div>
  )
}
