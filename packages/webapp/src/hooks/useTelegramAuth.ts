import { useEffect, useState, useRef, useCallback } from 'react'
import { authWithTelegram } from '@/api'
import { useAuth } from '@/hooks/useAuth'

/**
 * Authenticates the Mini App with the backend using Telegram initData.
 * Returns { ready, error, notInTelegram, forceReady }.
 * - ready: auth succeeded (or dev mode)
 * - error: auth failed
 * - notInTelegram: opened outside Telegram — show login UI
 * - forceReady: call this after a successful widget login to enter the app
 *
 * Re-authenticates automatically if the token gets cleared (e.g. after a 401
 * response nullifies the zustand store), preventing the silent failure loop
 * where the app appears loaded but all API calls return 401.
 */
export function useTelegramAuth() {
  const setAuth = useAuth((s) => s.setAuth)
  const token = useAuth((s) => s.token)
  const [ready, setReady] = useState(!!token)
  const [error, setError] = useState<string | null>(null)
  const [notInTelegram, setNotInTelegram] = useState(false)
  const authInFlight = useRef(false)

  function runAuth() {
    if (authInFlight.current) return
    authInFlight.current = true

    const initData = window.Telegram?.WebApp?.initData
    if (!initData) {
      if (import.meta.env.DEV) {
        setAuth('dev-token', { id: 'dev', first_name: 'Developer' })
        setReady(true)
        authInFlight.current = false
        return
      }
      setNotInTelegram(true)
      authInFlight.current = false
      return
    }

    authWithTelegram(initData)
      .then((r) => {
        // Backend returns { access_token, refresh_token, token_type } — no user object
        setAuth(r.data.access_token, r.data.user ?? {})
        setReady(true)
        setError(null)
      })
      .catch(() => setError('Authentication failed'))
      .finally(() => { authInFlight.current = false })
  }

  // Call this after a successful Telegram Login Widget flow to enter the app
  const forceReady = useCallback(() => {
    setNotInTelegram(false)
    setReady(true)
  }, [])

  // Initial auth on mount (skip if we already have a persisted token)
  useEffect(() => {
    if (token) {
      setReady(true)
      return
    }

    // Sometimes initData isn't available immediately. Retry a few times.
    let retries = 0
    const maxRetries = 10 // 10 * 100ms = 1s
    const interval = setInterval(() => {
      if (window.Telegram?.WebApp?.initData) {
        clearInterval(interval)
        runAuth()
      } else {
        retries++
        if (retries >= maxRetries) {
          clearInterval(interval)
          // If still no initData, try running anyway (will hit fallback logic)
          runAuth()
        }
      }
    }, 100)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-auth when token gets nullified by the 401 interceptor
  useEffect(() => {
    if (token === null && ready && !error && !notInTelegram) {
      setReady(false)
      runAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return { ready, error, notInTelegram, forceReady }
}
