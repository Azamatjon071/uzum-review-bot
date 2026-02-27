import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: Record<string, unknown> | null
  setAuth: (token: string, user: Record<string, unknown>) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('webapp_token', token)
        set({ token, user })
      },
      logout: () => {
        localStorage.removeItem('webapp_token')
        set({ token: null, user: null })
      },
    }),
    { name: 'uzumbot-webapp-auth' }
  )
)
