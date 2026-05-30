import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'

interface Props {
  msalInstance: PublicClientApplication
  onLogin: (account: AccountInfo) => void
}

export default function LoginScreen({ msalInstance, onLogin }: Props) {
  const handleLogin = async () => {
    const result = await msalInstance.loginPopup(loginRequest)
    if (result?.account) onLogin(result.account)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">DriveCurator</h1>
        <p className="text-gray-400">Ruim je OneDrive op met één swipe</p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 bg-white text-gray-900 font-medium px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors mx-auto"
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
            <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          </svg>
          Inloggen met Microsoft
        </button>
      </div>
    </div>
  )
}
