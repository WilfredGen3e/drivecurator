import { useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { msalConfig } from './auth/msalConfig'
import LoginScreen from './components/LoginScreen'

const msalInstance = new PublicClientApplication(msalConfig)

export default function App() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    msalInstance.initialize().then(() => {
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length > 0) setAccount(accounts[0])
      setInitializing(false)
    })

    const callbackId = msalInstance.addEventCallback((event) => {
      if (event.eventType === 'msal:loginSuccess' && event.payload) {
        const payload = event.payload as { account: AccountInfo }
        setAccount(payload.account)
      }
    })

    return () => {
      if (callbackId) msalInstance.removeEventCallback(callbackId)
    }
  }, [])

  const handleLogout = () => {
    msalInstance.logoutPopup().then(() => setAccount(null))
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!account) {
    return <LoginScreen msalInstance={msalInstance} />
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
      <main className="flex items-center justify-center h-[calc(100vh-65px)]">
        <p className="text-gray-500">Mapnavigatie komt hier — Stap 3</p>
      </main>
    </div>
  )
}
