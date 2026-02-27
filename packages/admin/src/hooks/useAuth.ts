import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  setToken: (t: string) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => {
        localStorage.setItem('admin_token', token)
        set({ token })
      },
      logout: () => {
        localStorage.removeItem('admin_token')
        set({ token: null })
      },
    }),
    { name: 'uzumbot-admin-auth' }
  )
)
