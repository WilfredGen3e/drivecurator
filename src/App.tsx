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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!account) {
    return <LoginScreen msalInstance={msalInstance} onLogin={setAccount} />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">DriveSwipe</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{account.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>
      <main className="h-[calc(100vh-65px)] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Eerste foto's laden…</p>
          </div>
        ) : currentFolderId
          ? <TriageView msalInstance={msalInstance} account={account} onBack={reset} />
          : <FolderBrowser msalInstance={msalInstance} account={account} />}
      </main>
    </div>
  )
}
