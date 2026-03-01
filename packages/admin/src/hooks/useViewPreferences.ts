import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'list' | 'card' | 'grid' | 'table' | 'kanban'
export type Density = 'compact' | 'comfortable' | 'spacious'

interface ViewPrefs {
  views: Record<string, ViewMode>
  density: Density
  setView: (page: string, mode: ViewMode) => void
  setDensity: (d: Density) => void
  getView: (page: string, fallback?: ViewMode) => ViewMode
}

export const useViewPreferences = create<ViewPrefs>()(
  persist(
    (set, get) => ({
      views: {},
      density: 'comfortable' as Density,
      setView: (page, mode) =>
        set((s) => ({ views: { ...s.views, [page]: mode } })),
      setDensity: (density) => set({ density }),
      getView: (page, fallback = 'table') => get().views[page] || fallback,
    }),
    { name: 'uzumbot-admin-view-prefs' }
  )
)

export const densityClasses = {
  compact: { padding: 'py-1 px-2', gap: 'gap-1.5', text: 'text-xs', spacing: 'space-y-1', gridCols: 'grid-cols-4' },
  comfortable: { padding: 'py-2.5 px-3', gap: 'gap-3', text: 'text-sm', spacing: 'space-y-3', gridCols: 'grid-cols-3' },
  spacious: { padding: 'py-4 px-4', gap: 'gap-5', text: 'text-base', spacing: 'space-y-5', gridCols: 'grid-cols-2' },
}
