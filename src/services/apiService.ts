import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'

export interface UserProfile {
  id: string
  displayName: string
  email: string
  photosTriaged: number
  isPremium: boolean
  isAdmin: boolean
  isBlocked: boolean
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

export class AccountBlockedError extends Error {
  constructor() {
    super('account_blocked')
  }
}

async function getApiPayload(msalInstance: PublicClientApplication, account: AccountInfo) {
  const response = await msalInstance
    .acquireTokenSilent({ scopes: ['User.Read'], account })
    .catch(() => msalInstance.acquireTokenPopup({ scopes: ['User.Read'], account }))
  return {
    token: response.accessToken,
    userId: account.localAccountId,
    email: account.username,
    displayName: account.name ?? '',
  }
}

export async function registerUser(
  msalInstance: PublicClientApplication,
  account: AccountInfo
): Promise<UserProfile> {
  const payload = await getApiPayload(msalInstance, account)
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Register failed: ${res.status}`)
  const user: UserProfile = await res.json()
  if (user.isBlocked) throw new AccountBlockedError()
  return user
}

export async function adminListUsers(
  msalInstance: PublicClientApplication,
  account: AccountInfo
): Promise<UserProfile[]> {
  const payload = await getApiPayload(msalInstance, account)
  const res = await fetch('/api/admin/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${payload.token}` },
  })
  if (!res.ok) throw new Error(`Admin list failed: ${res.status}`)
  return res.json()
}

export async function adminUpdateUser(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  userId: string,
  patch: Partial<Pick<UserProfile, 'freeTierLimit' | 'isPremium' | 'isBlocked'>>
): Promise<UserProfile> {
  const payload = await getApiPayload(msalInstance, account)
  const res = await fetch('/api/admin/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${payload.token}` },
    body: JSON.stringify({ userId, ...patch }),
  })
  if (!res.ok) throw new Error(`Admin update failed: ${res.status}`)
  return res.json()
}

export async function adminDeleteUser(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  userId: string
): Promise<void> {
  const payload = await getApiPayload(msalInstance, account)
  const res = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${payload.token}` },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`Admin delete failed: ${res.status}`)
}

export async function incrementUsage(
  msalInstance: PublicClientApplication,
  account: AccountInfo
): Promise<UserProfile> {
  const payload = await getApiPayload(msalInstance, account)
  const res = await fetch('/api/usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 403) {
    const data = await res.json()
    throw new FreeLimitReachedError(data)
  }
  if (!res.ok) throw new Error(`Usage increment failed: ${res.status}`)
  return res.json()
}
