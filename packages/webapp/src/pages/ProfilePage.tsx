import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { t, currentLang, setLang, prizeName } from '@/i18n'
import { getMe, getReferralStats, getSpinHistory } from '@/api'

const LANG_OPTIONS = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const

const PRIZE_TYPE_COLORS: Record<string, string> = {
  cashback: '#10b981',
  discount: '#6c63ff',
  gift_card: '#f59e0b',
  physical: '#ef4444',
  spin_again: '#3b82f6',
  charity_points: '#34d399',
  no_prize: 'rgba(255,255,255,0.2)',
}

function avatarBg(name?: string) {
  const colors = ['#6c63ff', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
  if (!name) return colors[0]
  return colors[name.charCodeAt(0) % colors.length]
}

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function ProfilePage() {
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [activeLang, setActiveLang] = useState(currentLang())
  const [copied, setCopied] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe().then((r) => r.data),
  })

  const { data: referralData } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => getReferralStats().then((r) => r.data),
  })

  const { data: historyData } = useQuery({
    queryKey: ['spin-history'],
    queryFn: () => getSpinHistory().then((r) => r.data),
  })

  const user = meData?.user ?? meData ?? null
  const referral = referralData ?? null
  const spinHistory: any[] = historyData?.history ?? historyData?.spins ?? []

  const displayName = user?.first_name
    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
    : user?.username
      ? `@${user.username}`
      : 'User'

  const referralCode = referral?.referral_code ?? user?.referral_code ?? ''
  const botUsername = 'UzumReviewBot' // replace with env var if available
  const referralLink = `https://t.me/${botUsername}?start=${referralCode}`

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleShare() {
    const tw = (window as any).Telegram?.WebApp
    if (tw?.openTelegramLink) {
      tw.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`)
    } else {
      handleCopy()
    }
  }

  function handleLangSelect(code: typeof activeLang) {
    setLang(code)
    setActiveLang(code)
    setLangMenuOpen(false)
    // force re-render by re-mounting (simple approach via key)
    window.location.reload()
  }

  const stats = [
    {
      label: t('profile_spins'),
      value: user?.spin_count ?? referral?.total_spins ?? '—',
      icon: '🎡',
      color: '#6c63ff',
    },
    {
      label: t('profile_total_wins'),
      value: user?.total_wins ?? referral?.total_wins ?? '—',
      icon: '🏆',
      color: '#f59e0b',
    },
    {
      label: t('profile_referrals'),
      value: referral?.referral_count ?? referral?.total_referrals ?? 0,
      icon: '👥',
      color: '#10b981',
    },
    {
      label: t('profile_bonus_spins'),
      value: referral?.bonus_spins ?? referral?.earned_bonus_spins ?? 0,
      icon: '⭐',
      color: '#ec4899',
    },
  ]

  const visibleHistory = historyExpanded ? spinHistory : spinHistory.slice(0, 4)

  return (
    <div
      className="px-4 pt-6 pb-28 min-h-screen relative"
      style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)', filter: 'blur(35px)' }}
      />
      <div
        className="fixed bottom-32 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(30px)' }}
      />

      {/* ── Avatar & Name ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-6 relative"
      >
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-3 relative"
          style={{
            background: `linear-gradient(135deg, ${avatarBg(user?.first_name)}, ${avatarBg(user?.username)})`,
            boxShadow: `0 0 32px ${avatarBg(user?.first_name)}55`,
          }}
        >
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white">{initials(displayName)}</span>
          )}
          {/* Online badge */}
          <span
            className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
            style={{ background: '#10b981', borderColor: '#0f0f1a' }}
          />
        </div>

        <h1 className="text-xl font-bold text-white">{displayName}</h1>
        {user?.username && (
          <p className="text-sm mt-0.5" style={{ color: 'rgba(167,139,250,0.6)' }}>@{user.username}</p>
        )}
      </motion.div>

      {/* ── Stats grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 gap-3 mb-5"
      >
        {stats.map(({ label, value, icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${color}22`,
              boxShadow: `0 4px 16px ${color}10`,
            }}
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
              <p className="text-lg font-bold" style={{ color }}>{value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Referral card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-3xl p-5 mb-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e1248 0%, #2d1b6e 50%, #1a1040 100%)',
          border: '1px solid rgba(108,99,255,0.3)',
          boxShadow: '0 8px 32px rgba(108,99,255,0.15)',
        }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/[0.04]" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎁</span>
            <h2 className="font-bold text-white">{t('profile_referral_code')}</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: 'rgba(167,139,250,0.6)' }}>
            {t('profile_referral_info')}
          </p>

          {/* Code badge */}
          {referralCode && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4 font-mono text-sm font-bold"
              style={{
                background: 'rgba(108,99,255,0.2)',
                border: '1px solid rgba(108,99,255,0.35)',
                color: '#a78bfa',
              }}
            >
              {referralCode}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: copied ? 'rgba(16,185,129,0.3)' : 'rgba(108,99,255,0.25)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(108,99,255,0.35)'}`,
                color: copied ? '#34d399' : '#a78bfa',
              }}
            >
              {copied ? `✓ ${t('copy_success')}` : t('profile_referral_copy')}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(90deg, #6c63ff, #8b5cf6)',
                boxShadow: '0 4px 15px rgba(108,99,255,0.3)',
              }}
            >
              {t('profile_invite_friends')}
            </button>
          </div>

          {/* Referral count badge */}
          {(referral?.referral_count ?? 0) > 0 && (
            <div
              className="mt-3 text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
              style={{ background: 'rgba(108,99,255,0.15)', color: 'rgba(167,139,250,0.8)' }}
            >
              <span>👥</span>
              <span>
                {referral.referral_count} {t('profile_referrals')} → {referral.bonus_spins ?? referral.earned_bonus_spins ?? referral.referral_count} {t('profile_bonus_spins')}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Spin history ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="rounded-2xl overflow-hidden mb-5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="font-semibold text-sm text-white">{t('profile_spin_history')}</span>
          <span
            className="text-xs transition-transform duration-200"
            style={{
              color: 'rgba(167,139,250,0.5)',
              transform: historyExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▾
          </span>
        </button>

        {spinHistory.length === 0 ? (
          <div className="px-4 pb-4">
            <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {t('profile_no_history')}
            </p>
          </div>
        ) : (
          <div>
            {visibleHistory.map((spin: any, i: number) => {
              const prizeType = spin.prize?.prize_type ?? spin.prize_type ?? 'no_prize'
              const color = PRIZE_TYPE_COLORS[prizeType] ?? PRIZE_TYPE_COLORS.no_prize
              const name = spin.prize ? prizeName(spin.prize) : '—'
              const date = spin.created_at ? formatDistanceToNow(parseISO(spin.created_at), { addSuffix: true }) : ''
              return (
                <motion.div
                  key={spin.id ?? i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-t"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
                  >
                    🎡
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{date}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: `${color}18`, color }}
                  >
                    {prizeType.replace(/_/g, ' ')}
                  </span>
                </motion.div>
              )
            })}

            {spinHistory.length > 4 && (
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="w-full py-2.5 text-xs font-medium border-t transition-all"
                style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(167,139,250,0.6)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {historyExpanded
                  ? '▲ Show less'
                  : `▼ Show ${spinHistory.length - 4} more`}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Language selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl overflow-hidden mb-4"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <button
          onClick={() => setLangMenuOpen(!langMenuOpen)}
          className="w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌐</span>
            <span className="text-sm font-medium text-white">{t('profile_language')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'rgba(167,139,250,0.7)' }}>
              {LANG_OPTIONS.find((l) => l.code === activeLang)?.flag}{' '}
              {LANG_OPTIONS.find((l) => l.code === activeLang)?.label}
            </span>
            <span
              className="text-xs transition-transform duration-200"
              style={{
                color: 'rgba(167,139,250,0.5)',
                transform: langMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}
            >
              ▾
            </span>
          </div>
        </button>

        <AnimatePresence>
          {langMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {LANG_OPTIONS.map(({ code, label, flag }) => (
                  <button
                    key={code}
                    onClick={() => handleLangSelect(code)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all"
                    style={{
                      background: activeLang === code ? 'rgba(108,99,255,0.12)' : 'transparent',
                      color: activeLang === code ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span className="text-xl">{flag}</span>
                    <span className="font-medium">{label}</span>
                    {activeLang === code && <span className="ml-auto text-xs text-violet-400">✓</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── App version ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs mt-2"
        style={{ color: 'rgba(255,255,255,0.15)' }}
      >
        UzumBot v1.0.0
      </motion.p>
    </div>
  )
}
