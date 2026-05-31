import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'

export interface UserProfile {
  id: string
  displayName: string
  email: string
  photosTriaged: number
  isPremium: boolean
  isAdmin: boolean
  freeTierLimit: number
  hasReachedLimit: boolean
  remaining: number | null
}

export class FreeLimitReachedError extends Error {
  userProfile: UserProfile
  constructor(profile: UserProfile) {
    super('free_limit_reached')
    this.userProfile = profile
  }
}

async function getToken(msalInstance: PublicClientApplication, account: AccountInfo): Promise<string> {
  const response = await msalInstance
    .acquireTokenSilent({ scopes: ['User.Read'], account })
    .catch(() => msalInstance.acquireTokenPopup({ scopes: ['User.Read'], account }))
  return response.idToken
}

export async function registerUser(
  msalInstance: PublicClientApplication,
  account: AccountInfo
): Promise<UserProfile> {
  const token = await getToken(msalInstance, account)
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Register failed: ${res.status}`)
  return res.json()
}

export async function incrementUsage(
  msalInstance: PublicClientApplication,
  account: AccountInfo
): Promise<UserProfile> {
  const token = await getToken(msalInstance, account)
  const res = await fetch('/api/usage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 403) {
    const data = await res.json()
    throw new FreeLimitReachedError(data)
  }
  if (!res.ok) throw new Error(`Usage increment failed: ${res.status}`)
  return res.json()
}
