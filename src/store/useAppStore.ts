import { create } from 'zustand'
import { DriveItem } from '../services/graphService'

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
  error: string | null

  setFolder: (id: string, name: string) => void
  setPhotos: (photos: DriveItem[]) => void
  nextPhoto: () => void
  prevPhoto: () => void
  pushUndo: (action: UndoAction) => void
  popUndo: () => UndoAction | undefined
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentFolderId: null,
  currentFolderName: '',
  photos: [],
  currentIndex: 0,
  undoStack: [],
  loading: false,
  error: null,

  setFolder: (id, name) => set({ currentFolderId: id, currentFolderName: name, photos: [], currentIndex: 0, undoStack: [] }),

  setPhotos: (photos) => set({ photos, currentIndex: 0 }),

  nextPhoto: () => set((state) => ({ currentIndex: Math.min(state.currentIndex + 1, state.photos.length) })),

  prevPhoto: () => set((state) => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),

  pushUndo: (action) => set((state) => ({ undoStack: [...state.undoStack, action] })),

  popUndo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return undefined
    const last = undoStack[undoStack.length - 1]
    set({ undoStack: undoStack.slice(0, -1) })
    return last
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set({ currentFolderId: null, currentFolderName: '', photos: [], currentIndex: 0, undoStack: [] }),
}))
