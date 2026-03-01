import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useTelegramAuth } from '@/hooks/useTelegramAuth'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { authWithTelegramWidget } from '@/api'
import BottomNav from '@/components/layout/BottomNav'
import SpinPage from '@/pages/SpinPage'
import WalletPage from '@/pages/WalletPage'
import CharityPage from '@/pages/CharityPage'
import ProfilePage from '@/pages/ProfilePage'
import ReviewsPage from '@/pages/ReviewsPage'
import { t } from '@/i18n'

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'UzumReviewBot'


function AlertIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function NotInTelegramScreen({ onLogin }: { onLogin: () => void }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [widgetError, setWidgetError] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const setAuth = useAuth((s) => s.setAuth)

  useEffect(() => {
    // Expose callback for Telegram widget before injecting script
    ;(window as any).onTelegramWidgetAuth = async (user: Record<string, string | number>) => {
      setLoggingIn(true)
      setLoginError(null)
      try {
        const res = await authWithTelegramWidget(user)
        setAuth(res.data.access_token, res.data.user ?? {})
        onLogin()
      } catch {
        setLoginError("Login amalga oshmadi. Qaytadan urinib ko'ring.")
      } finally {
        setLoggingIn(false)
      }
    }

    if (!widgetRef.current) return

    try {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.async = true
      script.setAttribute('data-telegram-login', BOT_USERNAME)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-onauth', 'onTelegramWidgetAuth(user)')
      script.setAttribute('data-request-access', 'write')
      script.onerror = () => setWidgetError(true)
      widgetRef.current.appendChild(script)
    } catch {
      setWidgetError(true)
    }

    return () => {
      delete (window as any).onTelegramWidgetAuth
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center uzum-gradient">
      {/* Logo mark */}
      <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center mb-6 shadow-uzum-lg">
        <span className="text-white font-black text-4xl leading-none select-none">U</span>
      </div>

      {/* Brand name + subtitle */}
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">UzumBot</h1>
      <p className="text-white/75 text-sm leading-relaxed max-w-[260px] mb-8">
        Uzum Market sharhlar uchun sovrinlar platformasi
      </p>

      {/* Telegram Login Widget */}
      <div className="mb-4 min-h-[48px] flex items-center justify-center">
        {loggingIn ? (
          <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 text-white text-sm">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>Kirish...</span>
          </div>
        ) : (
          <div ref={widgetRef} />
        )}
      </div>
      {loginError && (
        <p className="text-white/70 text-xs mb-3">{loginError}</p>
      )}
      {widgetError && (
        <p className="text-white/60 text-xs mb-3">Widget yuklanmadi. Sahifani yangilang yoki Telegram ilovasidan kiring.</p>
      )}

      <p className="text-white/35 text-xs mt-4">
        Kirish uchun Telegram akkauntingiz kerak
      </p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5 text-destructive">
        <AlertIcon />
      </div>
      <h2 className="text-base font-semibold text-foreground mb-1">Xatolik yuz berdi</h2>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-1">{message}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Please restart the app from Telegram.
      </p>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
      <div className="w-12 h-12 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold text-foreground">UzumBot</span>
        <span className="text-xs text-muted-foreground">{t('loading')}</span>
      </div>
    </div>
  )
}

function AppShell() {
  useTheme()
  const { ready, error, notInTelegram, forceReady } = useTelegramAuth()

  if (notInTelegram) return <NotInTelegramScreen onLogin={forceReady} />
  if (error) return <ErrorScreen message={error} />
  if (!ready) return <LoadingScreen />

  return (
    <>
      <Routes>
        <Route path="/" element={<SpinPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/charity" element={<CharityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <AppShell />
    </BrowserRouter>
  )
}
