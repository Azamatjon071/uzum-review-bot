import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTelegramAuth } from '@/hooks/useTelegramAuth'
import BottomNav from '@/components/layout/BottomNav'
import SpinPage from '@/pages/SpinPage'
import WalletPage from '@/pages/WalletPage'
import CharityPage from '@/pages/CharityPage'
import { t } from '@/i18n'

const BG = 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)'

function AppShell() {
  const { ready, error } = useTelegramAuth()

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
        style={{ background: BG }}
      >
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-semibold text-white/70">{error}</p>
        <p className="text-sm mt-2" style={{ color: 'rgba(167,139,250,0.5)' }}>
          Open this app from Telegram.
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: BG }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(108,99,255,0.3)', borderTopColor: '#6c63ff' }}
          />
          <p className="text-sm" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('loading')}</p>
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
