import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'

export interface DriveItem {
  id: string
  name: string
  folder?: object
  file?: { mimeType: string }
  thumbnails?: { medium?: { url: string } }[]
}

async function getToken(msalInstance: PublicClientApplication, account: AccountInfo): Promise<string> {
  const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
  return response.accessToken
}

async function graphFetch<T>(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  url: string,
  options?: RequestInit,
): Promise<T> {
  const token = await getToken(msalInstance, account)
  const response = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) throw new Error(`Graph API fout: ${response.status}`)
  if (response.status === 204) return undefined as T
  return response.json()
}

export async function getRootFolders(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
): Promise<DriveItem[]> {
  const data = await graphFetch<{ value: DriveItem[] }>(msalInstance, account, '/me/drive/root/children')
  return data.value.filter((item) => item.folder)
}

export async function getFolderContents(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  folderId: string,
): Promise<DriveItem[]> {
  const data = await graphFetch<{ value: DriveItem[] }>(
    msalInstance,
    account,
    `/me/drive/items/${folderId}/children?$expand=thumbnails`,
  )
  return data.value.filter((item) => item.file?.mimeType.startsWith('image/'))
}

export async function deleteItem(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  itemId: string,
): Promise<void> {
  await graphFetch<undefined>(msalInstance, account, `/me/drive/items/${itemId}`, { method: 'DELETE' })
}

export async function moveItem(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  itemId: string,
  targetFolderId: string,
): Promise<void> {
  await graphFetch<DriveItem>(msalInstance, account, `/me/drive/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ parentReference: { id: targetFolderId } }),
  })
}
