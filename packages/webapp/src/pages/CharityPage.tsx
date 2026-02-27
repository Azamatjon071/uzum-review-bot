import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, isPast, parseISO } from 'date-fns'
import { t, prizeName, currentLang } from '@/i18n'
import { getPublicCampaigns, donateToCapmaign, giveSadaqa, getCharityLeaderboard } from '@/api'

// Quick donation amounts
const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000]

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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
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

export default function CharityPage() {
  const qc = useQueryClient()
  const [donatingTo, setDonatingTo] = useState<any>(null)
  const [donateAmount, setDonateAmount] = useState('')
  const [sadaqaAmount, setSadaqaAmount] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tab, setTab] = useState<'campaigns' | 'leaderboard'>('campaigns')
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

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
      donateToCapmaign(campaign_id, amount),
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
    <div
      className="px-4 pt-6 pb-28 min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #0a1a10 50%, #0f1a10 100%)' }}
    >
      {/* Ambient glow orbs */}
      <div
        className="fixed -top-20 left-1/3 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', filter: 'blur(30px)' }}
      />
      <div
        className="fixed bottom-32 -right-20 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.1) 0%, transparent 70%)', filter: 'blur(25px)' }}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative mb-5">
        <h1 className="text-2xl font-bold text-white">{t('charity_title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(167,243,208,0.55)' }}>{t('charity_subtitle')}</p>
      </motion.div>

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-2xl px-4 py-3 text-sm font-semibold mb-4 flex items-center gap-2 justify-center text-white"
            style={{
              background: 'linear-gradient(90deg, #059669, #10b981)',
              boxShadow: '0 8px 25px rgba(16,185,129,0.35)',
            }}
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
              className="rounded-2xl p-3.5 flex items-center gap-3"
              style={{
                background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-xs" style={{ color: 'rgba(167,243,208,0.5)' }}>{label}</p>
                <p className="font-bold text-sm text-white">{value}</p>
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
        className="rounded-3xl p-5 mb-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          border: '1px solid rgba(16,185,129,0.3)',
          boxShadow: '0 8px 32px rgba(5,150,105,0.2)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🤲</span>
            <h2 className="font-bold text-lg text-white">{t('charity_sadaqa_title')}</h2>
          </div>
          <p className="text-sm mb-3" style={{ color: 'rgba(167,243,208,0.7)' }}>{t('charity_sadaqa_desc')}</p>

          {/* Quick amount chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setSadaqaAmount(String(amt))}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: sadaqaAmount === String(amt)
                    ? 'rgba(167,243,208,0.9)'
                    : 'rgba(255,255,255,0.1)',
                  color: sadaqaAmount === String(amt) ? '#064e3b' : 'rgba(167,243,208,0.8)',
                  border: '1px solid rgba(167,243,208,0.2)',
                }}
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
              className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <button
              disabled={!sadaqaAmount || sadaqaMut.isPending}
              onClick={() => sadaqaMut.mutate(Number(sadaqaAmount))}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95"
              style={{ background: 'rgba(167,243,208,0.9)', color: '#064e3b' }}
            >
              {sadaqaMut.isPending ? '…' : t('charity_sadaqa_btn')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {([
          ['campaigns', t('charity_title')],
          ['leaderboard', t('charity_leaderboard')],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={
              tab === key
                ? {
                    background: 'linear-gradient(90deg, #059669, #10b981)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }
                : { color: 'rgba(167,243,208,0.5)' }
            }
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
                  className="rounded-2xl h-40 animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-5xl mb-3">🤲</div>
              <p style={{ color: 'rgba(167,243,208,0.4)' }}>{t('charity_no_campaigns')}</p>
            </motion.div>
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
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isFunded ? 'rgba(251,191,36,0.3)' : 'rgba(16,185,129,0.15)'}`,
                    }}
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
                            <h3 className="font-semibold text-white text-sm leading-snug">{prizeName(c)}</h3>
                            {isFunded && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}
                              >
                                ✨ {t('charity_funded')}
                              </span>
                            )}
                            {isClosed && !isFunded && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                              >
                                {t('charity_closed')}
                              </span>
                            )}
                          </div>

                          {/* Deadline & donor count */}
                          <div className="flex items-center gap-3 mt-1">
                            {deadline && (
                              <span className="text-xs" style={{ color: isClosed ? '#f87171' : 'rgba(167,243,208,0.5)' }}>
                                ⏰ {deadline}
                              </span>
                            )}
                            {(c.donor_count ?? 0) > 0 && (
                              <span className="text-xs" style={{ color: 'rgba(167,243,208,0.5)' }}>
                                👥 {c.donor_count}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedCampaign(isExpanded ? null : c.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform"
                          style={{
                            background: 'rgba(255,255,255,0.07)',
                            color: 'rgba(167,243,208,0.6)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          ▾
                        </button>
                      </div>

                      {/* Progress bar */}
                      {c.goal_amount > 0 && (
                        <div className="mt-3">
                          <div
                            className="w-full rounded-full h-1.5 overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.07)' }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.9, delay: 0.1 + i * 0.07 }}
                              className="h-1.5 rounded-full"
                              style={{
                                background: isFunded
                                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                  : 'linear-gradient(90deg, #059669, #34d399)',
                              }}
                            />
                          </div>
                          <div
                            className="flex justify-between text-xs mt-1"
                            style={{ color: 'rgba(167,243,208,0.45)' }}
                          >
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
                          <div
                            className="px-4 pb-4 pt-0"
                            style={{ borderTop: '1px solid rgba(16,185,129,0.1)' }}
                          >
                            {c.description_uz && (
                              <p
                                className="text-sm leading-relaxed mt-3 mb-3"
                                style={{ color: 'rgba(167,243,208,0.65)' }}
                              >
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
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0"
                                      style={{
                                        background: avatarColor(d.first_name),
                                        borderColor: '#0a1e16',
                                        color: 'white',
                                        zIndex: 5 - di,
                                      }}
                                    >
                                      {initials(d.first_name)}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-xs ml-2" style={{ color: 'rgba(167,243,208,0.5)' }}>
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
                          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-98"
                          style={{
                            background: 'linear-gradient(90deg, #059669, #10b981)',
                            boxShadow: '0 4px 15px rgba(16,185,129,0.2)',
                          }}
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
          {lbLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl h-16 animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: 'rgba(167,243,208,0.4)' }}>
              {t('charity_no_campaigns')}
            </p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry: any, i: number) => {
                const medal = MEDAL_STYLES[i]
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 rounded-2xl p-3.5"
                    style={{
                      background: i < 3 ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${i < 3 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {/* Rank badge */}
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={
                        i < 3
                          ? { background: medal.bg, boxShadow: `0 4px 12px ${medal.shadow}`, color: 'white' }
                          : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                      }
                    >
                      {i < 3 ? medal.emoji : i + 1}
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: avatarColor(entry.first_name), color: 'white' }}
                    >
                      {initials(entry.first_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {entry.first_name ?? `User #${i + 1}`}
                      </p>
                      {i === 0 && (
                        <p className="text-xs" style={{ color: 'rgba(251,191,36,0.7)' }}>
                          {t('charity_leaderboard').split(' ')[0]} #1 ⭐
                        </p>
                      )}
                    </div>

                    <span className="text-sm font-bold" style={{ color: '#34d399' }}>
                      {entry.total_donated?.toLocaleString()} <span className="text-xs font-normal opacity-60">UZS</span>
                    </span>
                  </motion.div>
                )
              })}
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
            className="fixed inset-0 z-30 flex items-end"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setDonatingTo(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl p-6"
              style={{
                background: 'linear-gradient(180deg, #0d2a1f 0%, #0a1e16 100%)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderBottom: 'none',
              }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

              <h2 className="font-bold text-lg text-white mb-0.5">{t('charity_donate_btn')}</h2>
              <p className="text-sm mb-5" style={{ color: 'rgba(167,243,208,0.6)' }}>
                {prizeName(donatingTo)}
              </p>

              {/* Quick amount chips */}
              <p className="text-xs mb-2" style={{ color: 'rgba(167,243,208,0.5)' }}>
                {t('charity_quick_amounts')}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(String(amt))}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background:
                        donateAmount === String(amt)
                          ? 'rgba(167,243,208,0.9)'
                          : 'rgba(255,255,255,0.08)',
                      color: donateAmount === String(amt) ? '#064e3b' : 'rgba(167,243,208,0.8)',
                      border: '1px solid rgba(167,243,208,0.15)',
                    }}
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
                className="w-full rounded-xl px-4 py-3 text-sm text-white mb-5 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setDonatingTo(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {t('cancel')}
                </button>
                <button
                  disabled={!donateAmount || donateMut.isPending}
                  onClick={() =>
                    donateMut.mutate({ campaign_id: donatingTo.id, amount: Number(donateAmount) })
                  }
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 active:scale-98 transition-all"
                  style={{
                    background: 'linear-gradient(90deg, #059669, #10b981)',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                  }}
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
