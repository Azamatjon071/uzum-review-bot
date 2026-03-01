import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { Heart, Users, ChevronDown, Trophy } from 'lucide-react'
import { t, prizeName, currentLang } from '@/i18n'
import { getPublicCampaigns, donateToCampaign, giveSadaqa, getCharityLeaderboard } from '@/api'
import { useViewPreferences, type ViewMode } from '@/hooks/useViewPreferences'
import ViewToggle from '@/components/ui/ViewToggle'
import EmptyState from '@/components/ui/EmptyState'

// Quick donation amounts
const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000]

// ── Feature 5: Motivational Quotes ──
const CHARITY_QUOTES: Record<string, string[]> = {
  uz: [
    'Eng yaxshi sadaqa — yashirin berilgan sadaqadir. (Hadis)',
    'Har bir yaxshilik — sadaqadir. (Buxoriy)',
    'Qo\'li ochiq inson — Allohga yaqindir. (Hadis)',
    'Mol kamaymas sadaqadan, balki ko\'payar barakadan.',
    'Bir hurmo bilan bo\'lsa ham sadaqa qiling. (Hadis)',
  ],
  ru: [
    'Лучшая милостыня — та, что дана тайно. (Хадис)',
    'Каждое доброе дело — это садака. (Бухари)',
    'Щедрый человек ближе к Аллаху. (Хадис)',
    'Имущество не убавится от милостыни, а прибавится благодатью.',
    'Подавайте милостыню, хотя бы половинкой финика. (Хадис)',
  ],
  en: [
    'The best charity is that given in secret. (Hadith)',
    'Every act of kindness is sadaqa. (Bukhari)',
    'The generous person is close to Allah. (Hadith)',
    'Wealth does not decrease from charity, it increases in barakah.',
    'Give charity even if it is a date. (Hadith)',
  ],
}

function QuotesRotator() {
  const lang = currentLang()
  const quotes = CHARITY_QUOTES[lang] ?? CHARITY_QUOTES['en']
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % quotes.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [quotes.length])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 text-center px-2"
    >
      <p className="text-xs mb-1.5 font-medium text-success/45">
        🌙 {t('charity_quote_title' as any)}
      </p>
      <div className="relative h-12 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="text-sm italic leading-relaxed absolute px-4 text-success/60"
          >
            {quotes[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Medal styles for top 3
const MEDAL_STYLES = [
  { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', shadow: 'rgba(251,191,36,0.6)', emoji: '🥇' },
  { bg: 'linear-gradient(135deg, #d1d5db, #9ca3af)', shadow: 'rgba(209,213,219,0.5)', emoji: '🥈' },
  { bg: 'linear-gradient(135deg, #cd7f32, #b45309)', shadow: 'rgba(180,83,9,0.5)', emoji: '🥉' },
]

// Avatar initials helper
function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Avatar color from name
function avatarColor(name?: string) {
  const colors = [
    '#6c63ff', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  ]
  if (!name) return colors[0]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

// Circular progress ring component
function ProgressRing({ pct, size = 72, stroke = 6, color = '#10b981' }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-border" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

/* ── Leaderboard Card View ── */
function LeaderboardCard({ entry, i }: { entry: any; i: number }) {
  const medal = MEDAL_STYLES[i]
  return (
    <motion.div
      key={entry.user_id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`rounded-2xl p-3.5 ${
        i < 3 ? 'bg-success/8 border border-success/20' : 'bg-card border border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Rank badge */}
        {i < 3 ? (
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
            style={{ background: medal.bg, boxShadow: `0 4px 12px ${medal.shadow}` }}
          >
            {medal.emoji}
          </span>
        ) : (
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-secondary text-muted-foreground">
            {i + 1}
          </span>
        )}

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
          style={{ background: avatarColor(entry.first_name) }}
        >
          {initials(entry.first_name)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {entry.first_name ?? `User #${i + 1}`}
          </p>
          {i === 0 && (
            <p className="text-xs text-warning/70">
              {t('charity_leaderboard').split(' ')[0]} #1
            </p>
          )}
        </div>

        <span className="text-sm font-bold text-success">
          {entry.total_donated?.toLocaleString()} <span className="text-xs font-normal opacity-60">UZS</span>
        </span>
      </div>
    </motion.div>
  )
}

/* ── Leaderboard List View (compact) ── */
function LeaderboardListItem({ entry, i }: { entry: any; i: number }) {
  const medal = MEDAL_STYLES[i]
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.03 }}
      className="flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2"
    >
      {i < 3 ? (
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          style={{ background: medal.bg, boxShadow: `0 2px 8px ${medal.shadow}` }}
        >
          {medal.emoji}
        </span>
      ) : (
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-secondary text-muted-foreground">
          {i + 1}
        </span>
      )}
      <p className="text-sm text-foreground truncate flex-1 min-w-0">
        {entry.first_name ?? `User #${i + 1}`}
      </p>
      <span className="text-sm font-bold text-success shrink-0">
        {entry.total_donated?.toLocaleString()} <span className="text-xs font-normal opacity-60">UZS</span>
      </span>
    </motion.div>
  )
}

export default function CharityPage() {
  const qc = useQueryClient()
  const [donatingTo, setDonatingTo] = useState<any>(null)
  const [donateAmount, setDonateAmount] = useState('')
  const [sadaqaAmount, setSadaqaAmount] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tab, setTab] = useState<'campaigns' | 'leaderboard'>('campaigns')
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const lbView = useViewPreferences((s) => s.getView)('charity-leaderboard', 'card')
  const setLbView = useViewPreferences((s) => s.setView)

  // Tick every minute for deadline countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['public-campaigns'],
    queryFn: () => getPublicCampaigns().then((r) => r.data),
  })

  const { data: leaderboardData, isLoading: lbLoading } = useQuery({
    queryKey: ['charity-leaderboard'],
    queryFn: () => getCharityLeaderboard().then((r) => r.data),
    enabled: tab === 'leaderboard',
  })

  const donateMut = useMutation({
    mutationFn: ({ campaign_id, amount }: { campaign_id: string; amount: number }) =>
      donateToCampaign(campaign_id, amount),
    onSuccess: () => {
      setSuccessMsg(t('charity_success'))
      setDonatingTo(null)
      setDonateAmount('')
      qc.invalidateQueries({ queryKey: ['public-campaigns'] })
      qc.invalidateQueries({ queryKey: ['charity-leaderboard'] })
      setTimeout(() => setSuccessMsg(''), 3500)
    },
  })

  const sadaqaMut = useMutation({
    mutationFn: (amount: number) => giveSadaqa(amount),
    onSuccess: () => {
      setSuccessMsg(t('charity_success'))
      setSadaqaAmount('')
      qc.invalidateQueries({ queryKey: ['rewards'] })
      setTimeout(() => setSuccessMsg(''), 3500)
    },
  })

  const campaigns: any[] = campaignsData?.campaigns ?? []
  const leaderboard: any[] = leaderboardData?.leaderboard ?? []

  // Format deadline
  function deadlineLabel(deadline?: string) {
    if (!deadline) return null
    try {
      const d = parseISO(deadline)
      if (isPast(d)) return t('charity_closed')
      return formatDistanceToNow(d, { addSuffix: true })
    } catch {
      return null
    }
  }

  const totalRaised = campaigns.reduce((s, c) => s + (c.raised_amount ?? 0), 0)
  const totalDonors = campaigns.reduce((s, c) => s + (c.donor_count ?? 0), 0)

  return (
    <div className="px-4 pt-6 pb-28 min-h-screen bg-background">
      {/* Ambient glow orbs */}
      <div className="fixed -top-20 left-1/3 w-72 h-72 rounded-full pointer-events-none bg-success/12 blur-[30px]" />
      <div className="fixed bottom-32 -right-20 w-56 h-56 rounded-full pointer-events-none bg-success/10 blur-[25px]" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative mb-5">
        <h1 className="text-2xl font-bold text-foreground">{t('charity_title')}</h1>
        <p className="text-sm mt-0.5 text-success/55">{t('charity_subtitle')}</p>
      </motion.div>

      {/* ── Feature 5: Motivational Quotes ── */}
      <QuotesRotator />

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-2xl px-4 py-3 text-sm font-semibold mb-4 flex items-center gap-2 justify-center bg-success text-success-foreground shadow-lg shadow-success/30"
          >
            <span>✅</span> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats summary row */}
      {campaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          {[
            { label: t('charity_raised'), value: `${totalRaised.toLocaleString()} UZS`, icon: '💚' },
            { label: t('charity_donors'), value: totalDonors.toLocaleString(), icon: '🤝' },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-2xl p-3.5 flex items-center gap-3 bg-success/7 border border-success/15"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-xs text-success/50">{label}</p>
                <p className="font-bold text-sm text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Sadaqa card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl p-5 mb-5 relative overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-700 border border-success/30 shadow-lg shadow-success/20"
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🤲</span>
            <h2 className="font-bold text-lg text-white">{t('charity_sadaqa_title')}</h2>
          </div>
          <p className="text-sm mb-3 text-emerald-200/70">{t('charity_sadaqa_desc')}</p>

          {/* Quick amount chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setSadaqaAmount(String(amt))}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  sadaqaAmount === String(amt)
                    ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-300 dark:text-emerald-900'
                    : 'bg-secondary/60 text-success/80 border border-success/20'
                }`}
              >
                {(amt / 1000).toFixed(0)}K
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('charity_sadaqa_placeholder')}
              value={sadaqaAmount}
              onChange={(e) => setSadaqaAmount(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none bg-white/10 border border-white/15 placeholder:text-white/40 focus:border-success/50"
            />
            <button
              disabled={!sadaqaAmount || sadaqaMut.isPending}
              onClick={() => sadaqaMut.mutate(Number(sadaqaAmount))}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95 bg-emerald-200 text-emerald-900 dark:bg-emerald-300 dark:text-emerald-900"
            >
              {sadaqaMut.isPending ? '…' : t('charity_sadaqa_btn')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl mb-5 bg-secondary/50">
        {([
          ['campaigns', t('charity_title')],
          ['leaderboard', t('charity_leaderboard')],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === key
                ? 'bg-gradient-to-r from-emerald-600 to-success text-white shadow-md shadow-success/30'
                : 'text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Campaigns ── */}
      {tab === 'campaigns' && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl h-40 animate-pulse bg-secondary/30"
                />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={Heart}
              title={t('charity_no_campaigns')}
            />
          ) : (
            <div className="space-y-4">
              {campaigns.map((c: any, i: number) => {
                const pct =
                  c.goal_amount > 0
                    ? Math.min(100, (c.raised_amount / c.goal_amount) * 100)
                    : 0
                const deadline = deadlineLabel(c.deadline)
                const isExpanded = expandedCampaign === c.id
                const isClosed = c.is_closed || (c.deadline && isPast(parseISO(c.deadline)))
                const isFunded = pct >= 100

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-2xl overflow-hidden bg-card border ${
                      isFunded ? 'border-warning/30' : 'border-border'
                    }`}
                  >
                    <div className="p-4">
                      {/* Campaign header row */}
                      <div className="flex items-start gap-3">
                        {/* Progress ring */}
                        {c.goal_amount > 0 && (
                          <div className="relative shrink-0">
                            <ProgressRing
                              pct={pct}
                              size={56}
                              stroke={5}
                              color={isFunded ? '#fbbf24' : '#10b981'}
                            />
                            <span
                              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                              style={{ color: isFunded ? '#fbbf24' : '#34d399' }}
                            >
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm leading-snug">{prizeName(c)}</h3>
                            {isFunded && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-warning/20 text-warning">
                                ✨ {t('charity_funded')}
                              </span>
                            )}
                            {isClosed && !isFunded && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive">
                                {t('charity_closed')}
                              </span>
                            )}
                          </div>

                          {/* Deadline & donor count */}
                          <div className="flex items-center gap-3 mt-1">
                            {deadline && (
                              <span className={`text-xs ${isClosed ? 'text-destructive' : 'text-success/50'}`}>
                                ⏰ {deadline}
                              </span>
                            )}
                            {(c.donor_count ?? 0) > 0 && (
                              <span className="text-xs text-success/50">
                                👥 {c.donor_count}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedCampaign(isExpanded ? null : c.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform bg-secondary text-muted-foreground ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress bar */}
                      {c.goal_amount > 0 && (
                        <div className="mt-3">
                          <div className="w-full rounded-full h-1.5 overflow-hidden bg-border">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.9, delay: 0.1 + i * 0.07 }}
                              className={`h-1.5 rounded-full ${
                                isFunded
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                  : 'bg-gradient-to-r from-emerald-600 to-success'
                              }`}
                            />
                          </div>
                          <div className="flex justify-between text-xs mt-1 text-success/45">
                            <span>{c.raised_amount?.toLocaleString()} UZS</span>
                            <span>{c.goal_amount?.toLocaleString()} UZS</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded: description + donor avatars */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-success/10">
                            {c.description_uz && (
                              <p className="text-sm leading-relaxed mt-3 mb-3 text-success/65">
                                {c.description_uz}
                              </p>
                            )}

                            {/* Donor avatars */}
                            {(c.recent_donors ?? []).length > 0 && (
                              <div className="flex items-center gap-1 mb-3">
                                <div className="flex -space-x-2">
                                  {(c.recent_donors as any[]).slice(0, 5).map((d: any, di: number) => (
                                    <div
                                      key={di}
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background shrink-0 text-white"
                                      style={{
                                        background: avatarColor(d.first_name),
                                        zIndex: 5 - di,
                                      }}
                                    >
                                      {initials(d.first_name)}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-xs ml-2 text-success/50">
                                  +{(c.donor_count ?? 0)} {t('charity_donors')}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Donate button */}
                    {!isClosed && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => {
                            setDonatingTo(c)
                            setDonateAmount('')
                          }}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] bg-gradient-to-r from-emerald-600 to-success shadow-md shadow-success/20"
                        >
                          {t('charity_donate_btn')}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Leaderboard ── */}
      {tab === 'leaderboard' && (
        <div>
          {/* View toggle for leaderboard */}
          <div className="flex justify-end mb-3">
            <ViewToggle
              current={lbView}
              onChange={(m: ViewMode) => setLbView('charity-leaderboard', m)}
              options={['list', 'card']}
            />
          </div>

          {lbLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl h-16 animate-pulse bg-secondary/30"
                />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title={t('charity_no_campaigns')}
            />
          ) : lbView === 'list' ? (
            <div className="space-y-2">
              {leaderboard.map((entry: any, i: number) => (
                <LeaderboardListItem key={entry.user_id} entry={entry} i={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry: any, i: number) => (
                <LeaderboardCard key={entry.user_id} entry={entry} i={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Donate bottom sheet ── */}
      <AnimatePresence>
        {donatingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end bg-black/75"
            onClick={() => setDonatingTo(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl p-6 bg-card border border-border border-b-0"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-5" />

              <h2 className="font-bold text-lg text-foreground mb-0.5">{t('charity_donate_btn')}</h2>
              <p className="text-sm mb-5 text-muted-foreground">
                {prizeName(donatingTo)}
              </p>

              {/* Quick amount chips */}
              <p className="text-xs mb-2 text-muted-foreground">
                {t('charity_quick_amounts')}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(String(amt))}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      donateAmount === String(amt)
                        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-300 dark:text-emerald-900'
                        : 'bg-secondary/60 text-success/80 border border-success/20'
                    }`}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <input
                type="number"
                placeholder={t('charity_sadaqa_placeholder')}
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm text-foreground mb-5 outline-none bg-secondary border border-border focus:border-primary"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setDonatingTo(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground border border-border bg-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  disabled={!donateAmount || donateMut.isPending}
                  onClick={() =>
                    donateMut.mutate({ campaign_id: donatingTo.id, amount: Number(donateAmount) })
                  }
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 active:scale-[0.98] transition-all bg-gradient-to-r from-emerald-600 to-success shadow-md shadow-success/30"
                >
                  {donateMut.isPending ? '…' : t('confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
