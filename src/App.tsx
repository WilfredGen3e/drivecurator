import { useEffect, useState } from 'react'
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
import { useAppStore } from './store/useAppStore'
import { registerUser, AccountBlockedError } from './services/apiService'
import { getFolderContents } from './services/graphService'

const msalInstance = new PublicClientApplication(msalConfig)

export default function App() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [showApp, setShowApp] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [screen, setScreen] = useState<'browse' | 'organize' | 'smart-sort'>('browse')
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null)

  const {
    reset, currentFolderId, loading,
    setCurrentUser, currentUser,
    setFolder, setPhotos, appendPhotos,
    setLoading: setAppLoading, setFullyLoaded, setError,
  } = useAppStore()

  const handleRegistration = async (acc: AccountInfo) => {
    try {
      const user = await registerUser(msalInstance, acc)
      setCurrentUser(user)
    } catch (e) {
      if (e instanceof AccountBlockedError) {
        setBlocked(true)
      }
    }
  }

  useEffect(() => {
    msalInstance.initialize().then(async () => {
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0) {
        setAccount(accounts[0])
        setShowApp(true)
        await handleRegistration(accounts[0])
      }
      setInitializing(false)
    })
  }, [])

  const handleLogout = () => {
    msalInstance.logoutPopup().then(() => {
      setAccount(null)
      setCurrentUser(null)
      reset()
      setShowApp(false)
      setBlocked(false)
      setSelectedFolder(null)
      setScreen('browse')
    })
  }

  const handleFolderSelected = (folder: { id: string; name: string }) => {
    setSelectedFolder(folder)
    setScreen('organize')
  }

  const handleStartManual = async () => {
    if (!selectedFolder || !account) return
    setFolder(selectedFolder.id, selectedFolder.name)
    setAppLoading(true)
    try {
      await getFolderContents(msalInstance, account, selectedFolder.id, (photos, isFirst) => {
        if (isFirst) {
          setPhotos(photos)
          setAppLoading(false)
        } else {
          appendPhotos(photos)
        }
      })
      setFullyLoaded(true)
    } catch {
      setError("Kon foto's niet ophalen")
      setAppLoading(false)
    }
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
    const { loginRequest } = await import('./auth/msalConfig')
    const result = await msalInstance.loginPopup(loginRequest)
    if (result?.account) {
      setAccount(result.account)
      setShowApp(true)
      await handleRegistration(result.account)
    }
  }

  if (!showApp || !account) {
    return <LandingPage onLogin={handleLogin} />
  }

  const currentStep = (loading || currentFolderId || screen === 'smart-sort') ? 3
                    : screen === 'organize' ? 2
                    : 1

  return (
    <div className="h-screen bg-fluent-bg-primary text-fluent-text-primary flex flex-col">
      <header className="flex items-center justify-between px-4 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0 h-12">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-sm">DriveCurator</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-fluent-text-secondary text-sm">{account.name}</span>
          {currentUser?.isAdmin && (
            <button
              onClick={() => setShowAdmin(v => !v)}
              className={`text-sm px-3 py-1 border rounded-sm transition-colors ${
                showAdmin
                  ? 'border-fluent-accent text-fluent-accent bg-fluent-accent-light'
                  : 'border-fluent-border-strong text-fluent-text-secondary hover:text-fluent-text-primary hover:bg-fluent-bg-hover'
              }`}
            >
              Beheer
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-fluent-text-secondary hover:text-fluent-text-primary px-3 py-1 border border-fluent-border-strong rounded-sm hover:bg-fluent-bg-hover transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {!showAdmin && <StepIndicator current={currentStep} />}

      <main className="flex-1 min-h-0">
        {showAdmin ? (
          <AdminPortal msalInstance={msalInstance} account={account} onClose={() => setShowAdmin(false)} />
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
            onBack={() => setScreen('organize')}
          />
        ) : screen === 'organize' && selectedFolder ? (
          <OrganizeHome
            folder={selectedFolder}
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
