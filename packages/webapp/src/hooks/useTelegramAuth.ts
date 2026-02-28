import { useEffect, useState } from 'react'
import { authWithTelegram } from '@/api'
import { useAuth } from '@/hooks/useAuth'

/**
 * Authenticates the Mini App with the backend using Telegram initData.
 * Returns { ready, error, notInTelegram }.
 * - ready: auth succeeded (or dev mode)
 * - error: auth failed (wrong credentials etc.)
 * - notInTelegram: opened outside Telegram — show "Open in Telegram" UI
 */
export function useTelegramAuth() {
  const setAuth = useAuth((s) => s.setAuth)
  const token = useAuth((s) => s.token)
  const [ready, setReady] = useState(!!token)
  const [error, setError] = useState<string | null>(null)
  const [notInTelegram, setNotInTelegram] = useState(false)

  useEffect(() => {
    if (token) { setReady(true); return }

    const initData = window.Telegram?.WebApp?.initData
    if (!initData) {
      // Dev mode: skip auth
      if (import.meta.env.DEV) {
        setReady(true)
        return
      }
      // Production: not opened from Telegram
      setNotInTelegram(true)
      return
    }

    authWithTelegram(initData)
      .then((r) => {
        setAuth(r.data.access_token, r.data.user)
        setReady(true)
      })
      .catch(() => setError('Authentication failed'))
  }, [])

  return { ready, error, notInTelegram }
}
