import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Lock, Mail, Shield, Zap, ArrowLeft } from 'lucide-react'
import { adminLogin, adminVerify2FA, adminInitForcedSetup, adminConfirmForcedSetup } from '@/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)

  const [step, setStep] = useState<'login' | 'totp' | 'setup'>('login')
  const [qrData, setQrData] = useState<{ secret: string; uri: string } | null>(null)
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminLogin(email, password)
      if (res.data.requires_2fa_setup) {
        setTempToken(res.data.temp_token)
        // Fetch QR code immediately
        try {
          const setupRes = await adminInitForcedSetup(res.data.temp_token)
          setQrData({ secret: setupRes.data.secret, uri: setupRes.data.qr_data_uri })
          setStep('setup')
        } catch {
          toast.error('Failed to initiate 2FA setup')
        }
      } else if (res.data.requires_2fa) {
        setTempToken(res.data.temp_token)
        setStep('totp')
      } else {
        setToken(res.data.access_token)
        navigate('/')
      }
    } catch {
      setError('Invalid email or password. Please try again.')
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminVerify2FA(tempToken, totpCode)
      setToken(res.data.access_token)
      navigate('/')
    } catch {
      setError('Invalid verification code. Please try again.')
      toast.error('Invalid 2FA code')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminConfirmForcedSetup(tempToken, totpCode)
      setToken(res.data.access_token)
      toast.success('2FA enabled successfully')
      navigate('/')
    } catch {
      setError('Invalid verification code. Please try again.')
      toast.error('Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* ── Left Brand Panel ── */}
      <div className="lg:w-[45%] uzum-gradient relative flex flex-col items-center justify-center px-8 py-16 lg:py-0 overflow-hidden">
        {/* Abstract pattern shapes */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large circle top-right */}
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-white/[0.04]" />
          {/* Medium circle bottom-left */}
          <div className="absolute -bottom-32 -left-16 w-[400px] h-[400px] rounded-full bg-white/[0.05]" />
          {/* Small accent circle */}
          <div className="absolute top-1/3 left-[15%] w-24 h-24 rounded-full bg-white/[0.06] blur-lg" />
          {/* Diagonal line pattern hint */}
          <div className="absolute top-0 left-0 right-0 bottom-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, white 40px, white 41px)`,
            }}
          />
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Brand content */}
        <div className="relative z-10 text-center max-w-md">
          {/* Logo mark */}
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-black/10">
            <Zap size={36} className="text-white lg:w-10 lg:h-10" />
          </div>

          <h1 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            UzumBot
          </h1>
          <p className="text-lg lg:text-xl text-white/80 font-medium mb-2">
            Admin Panel
          </p>

          {/* Description — desktop only */}
          <p className="text-white/50 text-sm lg:text-base leading-relaxed hidden lg:block mt-6 max-w-xs mx-auto">
            Manage submissions, users, prizes, campaigns, and everything in between.
          </p>

          {/* Feature badges — desktop only */}
          <div className="hidden lg:flex flex-wrap justify-center gap-2 mt-8">
            {['Real-time Analytics', 'User Management', 'Campaign Control'].map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium backdrop-blur-sm border border-white/[0.08]"
              >
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom brand footer — desktop only */}
        <div className="hidden lg:block absolute bottom-8 text-center">
          <p className="text-white/25 text-xs font-medium tracking-wider uppercase">
            Powered by UzumBot Platform
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[380px]">
          {step === 'login' ? (
            <div className="animate-fade-in">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Welcome back
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  Sign in to access the admin dashboard
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/15 text-destructive text-sm animate-fade-in">
                  <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">!</span>
                  </div>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email or Username
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center transition-colors group-focus-within:bg-primary/10">
                      <Mail size={15} className="text-muted-foreground transition-colors group-focus-within:text-primary" />
                    </div>
                    <input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="admin@a.com"
                      className="w-full rounded-xl border border-input bg-background pl-14 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center transition-colors group-focus-within:bg-primary/10">
                      <Lock size={15} className="text-muted-foreground transition-colors group-focus-within:text-primary" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-input bg-background pl-14 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                    'uzum-gradient text-white shadow-lg shadow-primary/20',
                    'hover:shadow-xl hover:shadow-primary/30 hover:brightness-110',
                    'active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Footer hint */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-center text-xs text-muted-foreground/60">
                  Contact a superadmin if you need to reset your password or get access.
                </p>
              </div>
            </div>
          ) : step === 'setup' ? (
            <div className="animate-fade-in">
              <button
                onClick={() => {
                  setStep('login')
                  setError('')
                  setTotpCode('')
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                Back to login
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck size={22} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Set up 2FA
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  Scan the QR code with your authenticator app
                </p>
              </div>

              {qrData && (
                <div className="flex flex-col items-center justify-center mb-8 p-4 bg-white rounded-xl border border-border">
                  <img src={qrData.uri} alt="QR Code" className="w-48 h-48" />
                  <p className="mt-2 text-xs font-mono text-muted-foreground break-all text-center max-w-[200px]">
                    {qrData.secret}
                  </p>
                </div>
              )}

              <form onSubmit={handleSetup} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="setup-totp" className="block text-sm font-medium text-foreground">
                    Verification code
                  </label>
                  <input
                    id="setup-totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    className="w-full rounded-xl border border-input bg-background px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground/30 outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                    'uzum-gradient text-white shadow-lg shadow-primary/20',
                    'hover:shadow-xl hover:shadow-primary/30 hover:brightness-110',
                    'active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      Verify & Enable
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Back button */}
              <button
                onClick={() => {
                  setStep('login')
                  setError('')
                  setTotpCode('')
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                Back to login
              </button>

              {/* Header */}
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Shield size={22} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Two-factor authentication
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/15 text-destructive text-sm animate-fade-in">
                  <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">!</span>
                  </div>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleTotp} className="space-y-5">
                {/* TOTP input */}
                <div className="space-y-1.5">
                  <label htmlFor="totp" className="block text-sm font-medium text-foreground">
                    Verification code
                  </label>
                  <input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    className="w-full rounded-xl border border-input bg-background px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground/30 outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Verify button */}
                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                    'uzum-gradient text-white shadow-lg shadow-primary/20',
                    'hover:shadow-xl hover:shadow-primary/30 hover:brightness-110',
                    'active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield size={15} />
                      Verify code
                    </>
                  )}
                </button>
              </form>

              {/* Hint */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <p className="text-center text-xs text-muted-foreground/60">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
