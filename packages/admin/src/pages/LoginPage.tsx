import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { adminLogin, adminVerify2FA } from '@/api'
import { useAuth } from '@/hooks/useAuth'

// Animated orb component
function Orb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`absolute rounded-full pointer-events-none ${className}`} style={style} />
}

// Floating label input
function FloatingInput({
  name,
  type: propType = 'text',
  label,
  autoComplete,
  required,
  autoFocus,
  maxLength,
  showToggle,
}: {
  name: string
  type?: string
  label: string
  autoComplete?: string
  required?: boolean
  autoFocus?: boolean
  maxLength?: number
  showToggle?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const inputType = showToggle ? (show ? 'text' : 'password') : propType

  return (
    <div className="relative">
      <input
        name={name}
        type={inputType}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder=" "
        className="w-full bg-white/10 border text-white placeholder-transparent rounded-xl px-4 pt-5 pb-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all peer pr-12"
        style={{
          borderColor: focused ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.1)',
        }}
      />
      <label
        className="absolute left-4 text-slate-400 text-xs font-medium transition-all pointer-events-none"
        style={{
          top: focused || value ? '8px' : '50%',
          transform: focused || value ? 'translateY(0)' : 'translateY(-50%)',
          fontSize: focused || value ? '10px' : '13px',
          color: focused ? '#60a5fa' : 'rgba(148,163,184,0.8)',
        }}
      >
        {label}
      </label>
      {showToggle && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          {show ? '🙈' : '👁️'}
        </button>
      )}
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuth((s) => s.setToken)
  const [step, setStep] = useState<'login' | 'totp'>('login')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Subtle card tilt on mouse move
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / rect.width
      const dy = (e.clientY - cy) / rect.height
      el.style.transform = `perspective(800px) rotateY(${dx * 4}deg) rotateX(${-dy * 4}deg)`
    }
    const handleLeave = () => {
      el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)'
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseleave', handleLeave)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 overflow-hidden">
      {/* Animated orbs */}
      <Orb
        className="w-[500px] h-[500px] animate-pulse"
        style={{
          top: '-15%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animationDuration: '4s',
        }}
      />
      <Orb
        className="w-[400px] h-[400px]"
        style={{
          bottom: '-15%',
          left: '-10%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(35px)',
          animation: 'pulse 5s ease-in-out infinite',
        }}
      />
      <Orb
        className="w-[250px] h-[250px]"
        style={{
          top: '40%',
          left: '15%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          filter: 'blur(25px)',
          animation: 'pulse 6s ease-in-out infinite reverse',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 shadow-2xl shadow-blue-900/50"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}
          >
            <span className="text-white text-2xl font-black">U</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">UzumBot Admin</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 'login' ? 'Sign in to your account' : 'Two-factor authentication'}
          </p>
        </div>

        {/* Card */}
        <div
          ref={cardRef}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl transition-transform duration-100 ease-out"
          style={{ willChange: 'transform' }}
        >
          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <FloatingInput
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                required
              />
              <FloatingInput
                name="password"
                type="password"
                label="Password"
                autoComplete="current-password"
                required
                showToggle
              />

              {/* Forgot password link */}
              <div className="text-right">
                <span className="text-xs text-slate-500 cursor-default">
                  Contact superadmin to reset password
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-1 hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)', boxShadow: '0 8px 25px rgba(99,102,241,0.35)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in →'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-5">
              <div className="text-center mb-2">
                <div
                  className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}
                >
                  <span className="text-3xl">🔐</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {/* TOTP code input */}
              <div>
                <input
                  name="code"
                  placeholder="000 000"
                  required
                  maxLength={6}
                  autoFocus
                  className="w-full bg-white/10 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)', boxShadow: '0 8px 25px rgba(99,102,241,0.35)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-slate-400 text-sm hover:text-slate-200 transition-colors py-1"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          UzumBot Admin Panel · Secure Access
        </p>
      </div>
    </div>
  )
}
