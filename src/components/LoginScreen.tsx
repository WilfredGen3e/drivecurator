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
    <div className="min-h-screen bg-fluent-bg-secondary flex items-center justify-center">
      <div className="bg-fluent-bg-primary border border-fluent-border p-10 text-center space-y-6 w-full max-w-sm" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-fluent-text-primary">DriveCurator</h1>
          <p className="text-fluent-text-secondary text-sm">Ruim je OneDrive op met één klik</p>
        </div>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 mx-auto bg-fluent-accent hover:bg-fluent-accent-hover text-white font-semibold px-5 py-2 text-sm transition-colors"
          style={{ borderRadius: 2 }}
        >
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
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
