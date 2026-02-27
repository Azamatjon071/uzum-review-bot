import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { adminLogin, adminVerify2FA } from '@/api'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)
  const [step, setStep] = useState<'login' | 'totp'>('login')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    try {
      const res = await adminLogin(fd.get('email') as string, fd.get('password') as string)
      if (res.data.requires_2fa) {
        setTempToken(res.data.temp_token)
        setStep('totp')
      } else {
        setToken(res.data.access_token)
        navigate('/')
      }
    } catch {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    try {
      const res = await adminVerify2FA(tempToken, fd.get('code') as string)
      setToken(res.data.access_token)
      navigate('/')
    } catch {
      toast.error('Invalid 2FA code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center mb-4 shadow-2xl shadow-blue-900/40">
            <span className="text-white text-2xl font-bold">U</span>
          </div>
          <h1 className="text-2xl font-bold text-white">UzumBot Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-900/40 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex w-12 h-12 rounded-xl bg-blue-500/20 items-center justify-center mb-3">
                  <span className="text-2xl">🔐</span>
                </div>
                <p className="text-sm text-slate-300">Enter your 6-digit authenticator code</p>
              </div>
              <input
                name="code"
                placeholder="000 000"
                required
                maxLength={6}
                autoFocus
                className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xl text-center tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-900/40 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-slate-400 text-sm hover:text-slate-200 transition-colors"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
