import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Globe, ChevronDown, Copy, Share2, Trophy, Star, Users, Disc3 } from 'lucide-react'
import { t, currentLang, setLang, prizeName } from '@/i18n'
import { getMe, getReferralStats, getSpinHistory } from '@/api'
import ThemeToggle from '@/components/ui/ThemeToggle'

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

// ── Feature 6: Achievement/Badge System ──
interface AchievementDef {
  key: string
  emoji: string
  labelKey: string
  check: (ctx: { user: any; referral: any; streak: number }) => boolean
}

const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_review', emoji: '📝', labelKey: 'badge_first_review', check: ({ user }) => (user?.total_submissions ?? user?.submission_count ?? 0) > 0 },
  { key: 'review_pro', emoji: '🏅', labelKey: 'badge_review_pro', check: ({ user }) => (user?.approved_submissions ?? user?.approved_count ?? 0) >= 10 },
  { key: 'lucky_spinner', emoji: '🍀', labelKey: 'badge_lucky_spinner', check: ({ user }) => (user?.total_wins ?? 0) > 0 },
  { key: 'spin_master', emoji: '🎰', labelKey: 'badge_spin_master', check: ({ user }) => (user?.total_spins ?? user?.spin_count ?? 0) >= 10 },
  { key: 'social_butterfly', emoji: '🦋', labelKey: 'badge_social_butterfly', check: ({ referral }) => (referral?.referral_count ?? referral?.total_referrals ?? 0) > 0 },
  { key: 'ambassador', emoji: '🌟', labelKey: 'badge_ambassador', check: ({ referral }) => (referral?.referral_count ?? referral?.total_referrals ?? 0) >= 5 },
  { key: 'generous_heart', emoji: '💝', labelKey: 'badge_generous_heart', check: () => false },
  { key: 'streak_king', emoji: '👑', labelKey: 'badge_streak_king', check: ({ streak }) => streak >= 3 },
]

function AchievementsSection({ user, referral, spinHistory }: { user: any; referral: any; spinHistory: any[] }) {
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    const s = parseInt(localStorage.getItem('spin_streak') ?? '0', 10)
    setStreak(s)
  }, [])

  const ctx = { user, referral, streak }
  const unlocked = ACHIEVEMENTS.filter((a) => a.check(ctx)).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.13 }}
      className="rounded-2xl p-4 mb-5 bg-card border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground">{t('achievements_title' as any)}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
          {(t('achievements_count' as any) as string).replace('{unlocked}', String(unlocked)).replace('{total}', String(ACHIEVEMENTS.length))}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACHIEVEMENTS.map((achievement, i) => {
          const isUnlocked = achievement.check(ctx)
          return (
            <motion.div
              key={achievement.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl relative ${
                isUnlocked
                  ? 'bg-primary/10 border border-primary/25 shadow-sm shadow-primary/15'
                  : 'bg-card/30 border border-border/50'
              }`}
            >
              <span
                className="text-xl"
                style={{
                  filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.5)',
                }}
              >
                {achievement.emoji}
              </span>
              {!isUnlocked && (
                <span className="absolute top-1.5 right-1.5 text-xs opacity-50">🔒</span>
              )}
              <span
                className={`text-center leading-tight text-[10px] ${
                  isUnlocked ? 'text-primary/80' : 'text-muted-foreground/40'
                }`}
              >
                {t(achievement.labelKey as any)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
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
    <div className="px-4 pt-6 pb-28 min-h-screen relative bg-background">
      {/* Ambient glow */}
      <div className="fixed -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none bg-primary/10 blur-[35px]" />
      <div className="fixed bottom-32 right-0 w-64 h-64 rounded-full pointer-events-none bg-purple-500/8 blur-[30px]" />

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
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-background" />
        </div>

        <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
        {user?.username && (
          <p className="text-sm mt-0.5 text-primary/60">@{user.username}</p>
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
            className="rounded-2xl p-4 flex items-center gap-3 bg-card border border-border"
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold" style={{ color }}>{value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Feature 6: Achievements ── */}
      <AchievementsSection user={user} referral={referral} spinHistory={spinHistory} />

      {/* ── Referral card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-3xl p-5 mb-5 relative overflow-hidden bg-gradient-to-br from-[#1e1248] to-[#2d1b6e] border border-primary/30 shadow-lg shadow-primary/15"
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/[0.04]" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎁</span>
            <h2 className="font-bold text-white">{t('profile_referral_code')}</h2>
          </div>
          <p className="text-xs mb-3 text-primary/60">
            {t('profile_referral_info')}
          </p>

          {/* Code badge */}
          {referralCode && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4 font-mono text-sm font-bold bg-primary/20 border border-primary/35 text-primary">
              {referralCode}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-success/30 border border-success/40 text-success'
                  : 'bg-primary/25 border border-primary/35 text-primary'
              }`}
            >
              {copied ? (
                <>✓ {t('copy_success')}</>
              ) : (
                <><Copy className="w-4 h-4" /> {t('profile_referral_copy')}</>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/30"
            >
              <Share2 className="w-4 h-4" />
              {t('profile_invite_friends')}
            </button>
          </div>

          {/* Referral count badge */}
          {(referral?.referral_count ?? 0) > 0 && (
            <div className="mt-3 text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-primary/15 text-primary/80">
              <Users className="w-3.5 h-3.5" />
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
        className="rounded-2xl overflow-hidden mb-5 bg-card border border-border"
      >
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="font-semibold text-sm text-foreground">{t('profile_spin_history')}</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${
              historyExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {spinHistory.length === 0 ? (
          <div className="px-4 pb-4">
            <p className="text-xs text-center py-4 text-muted-foreground/50">
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
                  className="flex items-center gap-3 px-4 py-3 border-t border-border/50"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
                  >
                    <Disc3 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground/50">{date}</p>
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
                className="w-full py-2.5 text-xs font-medium border-t border-border/50 transition-all text-muted-foreground/60 bg-secondary/30"
              >
                {historyExpanded
                  ? '▲ Show less'
                  : `▼ Show ${spinHistory.length - 4} more`}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Theme & Language section ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="rounded-2xl overflow-hidden mb-4 bg-card border border-border"
      >
        {/* Theme toggle row */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <Star className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t('profile_theme' as any) || 'Theme'}</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Language selector */}
        <button
          onClick={() => setLangMenuOpen(!langMenuOpen)}
          className="w-full flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t('profile_language')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary/70">
              {LANG_OPTIONS.find((l) => l.code === activeLang)?.flag}{' '}
              {LANG_OPTIONS.find((l) => l.code === activeLang)?.label}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${
                langMenuOpen ? 'rotate-180' : ''
              }`}
            />
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
              <div className="border-t border-border/50">
                {LANG_OPTIONS.map(({ code, label, flag }) => (
                  <button
                    key={code}
                    onClick={() => handleLangSelect(code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all border-t border-border/30 ${
                      activeLang === code
                        ? 'bg-primary/12 text-primary'
                        : 'text-foreground/70'
                    }`}
                  >
                    <span className="text-xl">{flag}</span>
                    <span className="font-medium">{label}</span>
                    {activeLang === code && <span className="ml-auto text-xs text-primary">✓</span>}
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
        className="text-center text-xs mt-2 text-muted-foreground/30"
      >
        UzumBot v1.0.0
      </motion.p>
    </div>
  )
}
