import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTelegramAuth } from '@/hooks/useTelegramAuth'
import { useTheme } from '@/hooks/useTheme'
import BottomNav from '@/components/layout/BottomNav'
import SpinPage from '@/pages/SpinPage'
import WalletPage from '@/pages/WalletPage'
import CharityPage from '@/pages/CharityPage'
import ProfilePage from '@/pages/ProfilePage'
import ReviewsPage from '@/pages/ReviewsPage'
import { t } from '@/i18n'

// Replace with your actual bot username if different
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'UzumReviewBot'

function AppShell() {
  // Ensure theme class is applied on mount
  useTheme()

  const { ready, error, notInTelegram } = useTelegramAuth()

  // Opened outside Telegram — show a friendly redirect screen
  if (notInTelegram) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
        {/* Logo / Icon */}
        <div className="text-7xl mb-6">🎡</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">UzumBot</h1>
        <p className="text-sm mb-8 text-muted-foreground">
          Uzum Market sharhlar uchun sovrinlar platformasi
        </p>

        {/* CTA button */}
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all active:scale-95 bg-[#229ed9] shadow-lg shadow-[#229ed9]/40 no-underline hover:bg-[#1a8abf]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.018 9.505c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.09 14.15l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.726.436z"/>
          </svg>
          Telegramda ochish
        </a>

        <p className="text-xs mt-6 text-muted-foreground/40">
          Bu ilova faqat Telegram ichida ishlaydi
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-semibold text-foreground/70">{error}</p>
        <p className="text-sm mt-2 text-muted-foreground">
          Please restart the app from Telegram.
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

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
