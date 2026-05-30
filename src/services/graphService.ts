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
  const fullUrl = url.startsWith('https://') ? url : `https://graph.microsoft.com/v1.0${url}`
  const response = await fetch(fullUrl, {
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
  onProgress?: (count: number) => void,
): Promise<DriveItem[]> {
  const all: DriveItem[] = []
  let url: string | undefined =
    `/me/drive/items/${folderId}/children?$expand=thumbnails&$select=id,name,size,file,folder,photo,fileSystemInfo,thumbnails&$top=200`

  while (url) {
    const data: { value: DriveItem[]; '@odata.nextLink'?: string } = await graphFetch(
      msalInstance, account, url,
    )
    const photos = data.value.filter((item: DriveItem) => item.file?.mimeType.startsWith('image/'))
    all.push(...photos)
    onProgress?.(all.length)
    url = data['@odata.nextLink']
  }

  return all
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
  parentFolderId: string,
  name: string,
): Promise<DriveItem> {
  return graphFetch<DriveItem>(msalInstance, account, `/me/drive/items/${parentFolderId}/children`, {
    method: 'POST',
    body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }),
  })
}
