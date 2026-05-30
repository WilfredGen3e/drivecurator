import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { msalConfig } from './auth/msalConfig'
import LoginScreen from './components/LoginScreen'
import FolderBrowser from './components/FolderBrowser'
import TriageView from './components/TriageView'
import { useAppStore } from './store/useAppStore'

const msalInstance = new PublicClientApplication(msalConfig)

export default function App() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [initializing, setInitializing] = useState(true)
  const { reset, currentFolderId, loading } = useAppStore()

  useEffect(() => {
    msalInstance.initialize().then(() => {
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0) setAccount(accounts[0])
      setInitializing(false)
    })
  }, [])

  const handleLogout = () => {
    msalInstance.logoutPopup().then(() => { setAccount(null); reset() })
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-fluent-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!account) {
    return <LoginScreen msalInstance={msalInstance} onLogin={setAccount} />
  }

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
          <button
            onClick={handleLogout}
            className="text-sm text-fluent-text-secondary hover:text-fluent-text-primary px-3 py-1 border border-fluent-border-strong rounded-sm hover:bg-fluent-bg-hover transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-7 h-7 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-fluent-text-secondary text-sm">Eerste foto's laden…</p>
          </div>
        ) : currentFolderId
          ? <TriageView msalInstance={msalInstance} account={account} onBack={reset} />
          : <FolderBrowser msalInstance={msalInstance} account={account} />}
      </main>
    </div>
  )
}
