import { create } from 'zustand'
import { DriveItem } from '../services/graphService'
import { UserProfile } from '../services/apiService'

type UndoAction =
  | { type: 'delete'; item: DriveItem; previousFolderId: string }
  | { type: 'move'; item: DriveItem; previousFolderId: string }

interface AppStore {
  currentFolderId: string | null
  currentFolderName: string
  photos: DriveItem[]
  currentIndex: number
  undoStack: UndoAction[]
  loading: boolean
  loadingCount: number
  fullyLoaded: boolean
  error: string | null
  currentUser: UserProfile | null

  setFolder: (id: string, name: string) => void
  setPhotos: (photos: DriveItem[]) => void
  appendPhotos: (photos: DriveItem[]) => void
  nextPhoto: () => void
  prevPhoto: () => void
  removeCurrentPhoto: () => void
  pushUndo: (action: UndoAction) => void
  popUndo: () => UndoAction | undefined
  setLoading: (loading: boolean) => void
  setLoadingCount: (count: number) => void
  setFullyLoaded: (fullyLoaded: boolean) => void
  setError: (error: string | null) => void
  setCurrentUser: (user: UserProfile | null) => void
  reset: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentFolderId: null,
  currentFolderName: '',
  photos: [],
  currentIndex: 0,
  undoStack: [],
  loading: false,
  loadingCount: 0,
  fullyLoaded: false,
  error: null,
  currentUser: null,

  setFolder: (id, name) => set({ currentFolderId: id, currentFolderName: name, photos: [], currentIndex: 0, undoStack: [] }),

  setPhotos: (photos) => set({ photos, currentIndex: 0, fullyLoaded: false }),

  appendPhotos: (photos) => set((state) => ({
    photos: [...state.photos, ...photos],
    loadingCount: state.photos.length + photos.length,
  })),

  nextPhoto: () => set((state) => ({ currentIndex: Math.min(state.currentIndex + 1, state.photos.length) })),

  prevPhoto: () => set((state) => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),

  removeCurrentPhoto: () => set((state) => {
    const photos = state.photos.filter((_, i) => i !== state.currentIndex)
    return { photos, currentIndex: Math.min(state.currentIndex, photos.length) }
  }),

  pushUndo: (action) => set((state) => ({ undoStack: [...state.undoStack, action] })),

  popUndo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return undefined
    const last = undoStack[undoStack.length - 1]
    set({ undoStack: undoStack.slice(0, -1) })
    return last
  },

  setLoading: (loading) => set({ loading, loadingCount: 0 }),

  setLoadingCount: (loadingCount) => set({ loadingCount }),

  setFullyLoaded: (fullyLoaded) => set({ fullyLoaded }),

  setError: (error) => set({ error }),

  setCurrentUser: (currentUser) => set({ currentUser }),

  reset: () => set({ currentFolderId: null, currentFolderName: '', photos: [], currentIndex: 0, undoStack: [], loading: false, loadingCount: 0, fullyLoaded: false }),
}))
