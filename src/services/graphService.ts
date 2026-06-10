import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { loginRequest } from '../auth/msalConfig'

export interface DriveItem {
  id: string
  name: string
  size?: number
  folder?: object
  file?: { mimeType: string }
  photo?: { takenDateTime?: string; cameraMake?: string; cameraModel?: string }
  fileSystemInfo?: { createdDateTime?: string; lastModifiedDateTime?: string }
  thumbnails?: { medium?: { url: string }; large?: { url: string } }[]
  location?: { latitude: number; longitude: number; altitude?: number }
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
  attempt = 0,
): Promise<T> {
  const token = await getToken(msalInstance, account)
  const fullUrl = url.startsWith('https://') ? url : `https://graph.microsoft.com/v1.0${url}`
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (response.status === 429 && attempt < 3) {
    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '0', 10)
    const waitMs = (retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000
    await new Promise(r => setTimeout(r, waitMs))
    return graphFetch(msalInstance, account, url, options, attempt + 1)
  }

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

export async function getSubFolders(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  folderId: string,
): Promise<DriveItem[]> {
  const data = await graphFetch<{ value: DriveItem[] }>(
    msalInstance,
    account,
    `/me/drive/items/${folderId}/children`,
  )
  return data.value.filter((item) => item.folder)
}

export async function getFolderContents(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  folderId: string,
  onPage: (photos: DriveItem[], isFirst: boolean) => void,
): Promise<void> {
  let url: string | undefined =
    `/me/drive/items/${folderId}/children?$expand=thumbnails&$select=id,name,size,file,folder,photo,fileSystemInfo,thumbnails,location&$top=200`
  let isFirst = true

  while (url) {
    const data: { value: DriveItem[]; '@odata.nextLink'?: string } = await graphFetch(
      msalInstance, account, url,
    )
    const photos = data.value.filter((item: DriveItem) => item.file?.mimeType.startsWith('image/'))
    onPage(photos, isFirst)
    isFirst = false
    url = data['@odata.nextLink']
  }
}

export async function getItemThumbnails(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  itemId: string,
): Promise<{ large?: { url: string }; medium?: { url: string } } | null> {
  try {
    const data = await graphFetch<{ value: { large?: { url: string }; medium?: { url: string } }[] }>(
      msalInstance, account, `/me/drive/items/${itemId}/thumbnails`
    )
    return data.value?.[0] ?? null
  } catch { return null }
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

export async function createFolder(
  msalInstance: PublicClientApplication,
  account: AccountInfo,
  parentFolderId: string | null,
  name: string,
): Promise<DriveItem> {
  const url = parentFolderId
    ? `/me/drive/items/${parentFolderId}/children`
    : `/me/drive/root/children`
  return graphFetch<DriveItem>(msalInstance, account, url, {
    method: 'POST',
    body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }),
  })
}
