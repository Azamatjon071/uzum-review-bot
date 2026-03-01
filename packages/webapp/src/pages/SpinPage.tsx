import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { t, prizeName } from '@/i18n'
import { getSpinCommitments, commitSpin, executeSpin, getPrizeOdds, getMyRewards } from '@/api'
import PrizeWheel from '@/components/wheel/PrizeWheel'

const PLACEHOLDER_SEGMENTS = [
  { id: 1, name_uz: '…', name_ru: '…', name_en: '…', color: '#6c63ff', weight: 10 },
  { id: 2, name_uz: '…', name_ru: '…', name_en: '…', color: '#10b981', weight: 10 },
  { id: 3, name_uz: '…', name_ru: '…', name_en: '…', color: '#f59e0b', weight: 10 },
  { id: 4, name_uz: '…', name_ru: '…', name_en: '…', color: '#ef4444', weight: 10 },
  { id: 5, name_uz: '…', name_ru: '…', name_en: '…', color: '#8b5cf6', weight: 10 },
  { id: 6, name_uz: '…', name_ru: '…', name_en: '…', color: '#06b6d4', weight: 10 },
]

// ── Feature 1: Enhanced Confetti with Stars + Glitter ──
function Confetti() {
  const colors = ['#6c63ff', '#a78bfa', '#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#FFD700', '#C0C0C0']
  const shapes = ['circle', 'star', 'rect', 'diamond', 'sparkle'] as const
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => {
        const shape = shapes[i % shapes.length]
        const size = 4 + Math.random() * 8
        const color = colors[i % colors.length]
        const content = shape === 'star' ? '★' : shape === 'diamond' ? '◆' : shape === 'sparkle' ? '✨' : null
        return (
          <motion.div
            key={i}
            className="absolute flex items-center justify-center"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-14px',
              width: size,
              height: size,
              ...(shape === 'circle'
                ? { borderRadius: '50%', background: color }
                : shape === 'rect'
                  ? { borderRadius: '2px', background: color }
                  : { fontSize: `${size}px`, lineHeight: 1, color }),
            }}
            animate={{
              y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
              x: (Math.random() - 0.5) * 200,
              rotate: Math.random() * 720,
              opacity: [1, 1, 0],
              scale: [1, 1.15, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 1.5,
              delay: Math.random() * 0.8,
              ease: 'easeIn',
            }}
          >
            {content}
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Feature 2: Rarity system ──
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
function getRarity(weight: number, totalWeight: number): Rarity {
  const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0
  if (pct >= 25) return 'common'
  if (pct >= 10) return 'uncommon'
  if (pct >= 5) return 'rare'
  if (pct >= 1) return 'epic'
  return 'legendary'
}

const RARITY_CLASSES: Record<Rarity, { className: string; label: string }> = {
  common:    { className: 'bg-muted text-muted-foreground', label: 'rarity_common' },
  uncommon:  { className: 'bg-success/15 text-success shadow-[0_0_6px] shadow-success/40', label: 'rarity_uncommon' },
  rare:      { className: 'bg-blue-500/15 text-blue-400 shadow-[0_0_8px] shadow-blue-400/50', label: 'rarity_rare' },
  epic:      { className: 'bg-primary/15 text-primary shadow-[0_0_12px] shadow-primary/60', label: 'rarity_epic' },
  legendary: { className: 'bg-amber-500/15 text-amber-400 animate-pulse-glow', label: 'rarity_legendary' },
}

function RarityBadge({ weight, totalWeight }: { weight: number; totalWeight: number }) {
  const rarity = getRarity(weight, totalWeight)
  const rc = RARITY_CLASSES[rarity]
  return (
    <motion.span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block ${rc.className}`}
      {...(rarity === 'legendary' ? {
        animate: { boxShadow: ['0 0 8px rgba(255,215,0,0.3)', '0 0 18px rgba(255,215,0,0.7)', '0 0 8px rgba(255,215,0,0.3)'] },
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      } : {})}
    >
      {t(rc.label as any)}
    </motion.span>
  )
}

// ── Feature 3: Animated Number Counter ──
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const targetRef = useRef(value)

  const animate = useCallback(() => {
    const target = targetRef.current
    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // easeOut: 1 - (1-p)^3
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    startRef.current = null
    rafRef.current = requestAnimationFrame(step)
  }, [duration])

  useEffect(() => {
    targetRef.current = value
    animate()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, animate])

  return <>{display}</>
}

// ── Feature 4: Social Proof Live Feed Ticker ──
function LiveFeedTicker({ prizes }: { prizes: any[] }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [key, setKey] = useState(0)

  const messages = useCallback((): string[] => {
    const prizeNames = prizes.filter((p: any) => p.weight > 0).map((p: any) => prizeName(p))
    const randomPrize = prizeNames.length > 0 ? prizeNames[Math.floor(Math.random() * prizeNames.length)] : '—'
    const todayCount = 5 + Math.floor(Math.random() * 20)
    const spinningNow = 1 + Math.floor(Math.random() * 5)
    return [
      (t('live_someone_won' as any) as string).replace('{prize}', randomPrize),
      (t('live_prizes_today' as any) as string).replace('{count}', String(todayCount)),
      (t('live_spinning_now' as any) as string).replace('{count}', String(spinningNow)),
    ]
  }, [prizes])

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % 3)
      setKey((k) => k + 1)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const currentMessages = messages()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-4 w-full max-w-xs relative z-10 rounded-xl px-4 py-2.5 overflow-hidden bg-card/30 border border-border/30 backdrop-blur-sm"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={key}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-xs text-center text-muted-foreground/55"
        >
          {currentMessages[msgIndex]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  )
}

export default function SpinPage() {
  const qc = useQueryClient()
  const [spinning, setSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [showOdds, setShowOdds] = useState(false)
  const [activeCommitment, setActiveCommitment] = useState<any>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [streak, setStreak] = useState(0)

  // Streak: track from localStorage
  useEffect(() => {
    const s = parseInt(localStorage.getItem('spin_streak') ?? '0', 10)
    setStreak(s)
  }, [])

  const { data: commitmentsData } = useQuery({
    queryKey: ['spin-commitments'],
    queryFn: () => getSpinCommitments().then((r) => r.data),
  })

  const { data: oddsData } = useQuery({
    queryKey: ['prize-odds'],
    queryFn: () => getPrizeOdds().then((r) => r.data),
  })

  const { data: rewardsData } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => getMyRewards().then((r) => r.data),
  })

  const commitMut = useMutation({
    mutationFn: commitSpin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spin-commitments'] })
    },
  })

  const spinMut = useMutation({
    mutationFn: (commitment_id: string) => executeSpin(commitment_id),
    onSuccess: (res) => {
      const spinResult = res.data
      const prizes: any[] = oddsData?.prizes ?? PLACEHOLDER_SEGMENTS
      const idx = prizes.findIndex((p: any) => p.id === spinResult.prize?.id)
      setTargetIndex(idx >= 0 ? idx : 0)
      setSpinning(true)
      setResult(spinResult)
      // Haptic feedback
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('heavy') } catch {}
    },
  })

  const pendingCommitments = (commitmentsData?.commitments ?? []).filter(
    (c: any) => !c.is_used
  )
  const prizes: any[] = oddsData?.prizes ?? PLACEHOLDER_SEGMENTS
  const totalWeight = prizes.reduce((s: number, p: any) => s + p.weight, 0)

  // Recent wins: last 3 pending/claimed rewards
  const recentWins = (rewardsData?.rewards ?? []).slice(0, 3)

  function handleSpin() {
    if (spinning || pendingCommitments.length === 0) return
    const commitment = activeCommitment ?? pendingCommitments[0]
    spinMut.mutate(commitment.id)
  }

  function handleSpinEnd() {
    setSpinning(false)
    qc.invalidateQueries({ queryKey: ['spin-commitments'] })
    qc.invalidateQueries({ queryKey: ['rewards'] })
    if (result?.prize) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
      // Update streak
      const today = new Date().toDateString()
      const lastSpinDate = localStorage.getItem('last_spin_date')
      const currentStreak = parseInt(localStorage.getItem('spin_streak') ?? '0', 10)
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      let newStreak = 1
      if (lastSpinDate === yesterday) newStreak = currentStreak + 1
      else if (lastSpinDate === today) newStreak = currentStreak
      localStorage.setItem('last_spin_date', today)
      localStorage.setItem('spin_streak', String(newStreak))
      setStreak(newStreak)
    }
  }

  function handleShare() {
    const msg = `I won ${prizeName(result?.prize)} on UzumBot! Try your luck 🎉`
    try { (window as any).Telegram?.WebApp?.openTelegramLink?.(`https://t.me/share/url?text=${encodeURIComponent(msg)}`) } catch {}
  }

  function copyClaimCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasSpins = pendingCommitments.length > 0

  return (
    <div className="flex flex-col items-center pb-24 pt-6 px-4 min-h-screen relative overflow-hidden bg-background">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/20 blur-[40px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-48 h-48 rounded-full bg-purple-500/10 blur-[30px] pointer-events-none" />

      {showConfetti && <Confetti />}

      {/* Header row */}
      <div className="w-full flex items-start justify-between mb-3 relative z-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground tracking-tight"
          >
            {t('spin_title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm mt-0.5 text-muted-foreground/60"
          >
            {t('spin_subtitle')}
          </motion.p>
        </div>

        {/* Streak badge */}
        {streak > 1 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 bg-gradient-to-r from-amber-500 to-red-500 shadow-lg shadow-amber-500/40">
              🔥 {streak} {t('spin_streak')}
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="w-full flex gap-3 mb-4 relative z-10"
      >
        <div className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-3 bg-primary/15 border border-primary/30">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-xs text-muted-foreground/60">{t('spin_available')}</p>
            <p className="text-xl font-bold text-foreground"><AnimatedNumber value={pendingCommitments.length} /></p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-3 bg-card/50 border border-border">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-muted-foreground/60">{t('spin_total_spins')}</p>
            <p className="text-xl font-bold text-foreground"><AnimatedNumber value={rewardsData?.rewards?.length ?? 0} /></p>
          </div>
        </div>
      </motion.div>

      {/* Wheel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10"
        style={{ filter: spinning ? 'drop-shadow(0 0 30px rgba(108,99,255,0.6))' : 'none', transition: 'filter 0.3s' }}
      >
        <PrizeWheel
          segments={prizes}
          targetIndex={targetIndex}
          spinning={spinning}
          onSpinEnd={handleSpinEnd}
        />
      </motion.div>

      {/* Spin button area */}
      <div className="mt-6 w-full max-w-xs relative z-10">
        {hasSpins ? (
          <>
            {pendingCommitments.length > 1 && (
              <select
                className="w-full rounded-xl px-4 py-3 text-sm mb-3 text-foreground bg-secondary border border-border focus:outline-none focus:border-primary"
                value={activeCommitment?.id ?? ''}
                onChange={(e) => {
                  const c = pendingCommitments.find((c: any) => c.id === e.target.value)
                  setActiveCommitment(c ?? null)
                }}
              >
                {pendingCommitments.map((c: any) => (
                  <option key={c.id} value={c.id} className="bg-card">
                    #{c.id.slice(0, 8)} — {new Date(c.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={spinning || spinMut.isPending}
              onClick={handleSpin}
              className={`w-full font-bold py-4 rounded-2xl text-lg transition-all relative overflow-hidden ${
                spinning || spinMut.isPending
                  ? 'bg-primary/40 text-foreground/70'
                  : 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-[0_0_30px] shadow-primary/50'
              }`}
            >
              {spinning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  <span className="text-foreground/70">Spinning…</span>
                </span>
              ) : spinMut.isPending ? t('spin_prepare') : t('spin_button')}
            </motion.button>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 px-6 rounded-2xl bg-card/50 border border-border mb-3"
            >
              <div className="text-4xl mb-3">🎡</div>
              <p className="font-semibold text-foreground/70">{t('spin_no_spins')}</p>
              <p className="text-sm mt-1 text-muted-foreground/40">{t('spin_no_spins_sub')}</p>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => commitMut.mutate()}
              disabled={commitMut.isPending}
              className="w-full py-3 rounded-2xl text-sm font-medium text-muted-foreground border border-border bg-secondary transition-all hover:border-primary/50"
            >
              {commitMut.isPending ? t('spin_prepare') : t('spin_commit_btn')}
            </motion.button>
          </>
        )}
      </div>

      {/* Provably fair link */}
      <button
        onClick={() => setShowOdds(true)}
        className="mt-5 text-xs transition-colors relative z-10 underline underline-offset-2 text-muted-foreground/50 hover:text-primary"
      >
        {t('spin_fair_info')}
      </button>

      {/* Recent wins mini feed */}
      {recentWins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 w-full max-w-xs relative z-10"
        >
          <p className="text-xs mb-2 font-medium text-muted-foreground/60">
            {t('spin_recent_wins')}
          </p>
          <div className="space-y-2">
            {recentWins.map((r: any, i: number) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 bg-card/50 border border-border/50"
              >
                <span
                  className="w-6 h-6 rounded-full shrink-0"
                  style={{ background: r.prize?.color ?? '#6c63ff', boxShadow: `0 0 8px ${r.prize?.color ?? '#6c63ff'}60` }}
                />
                <span className="text-xs text-foreground/70 flex-1 truncate">{prizeName(r.prize) ?? '—'}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    r.status === 'claimed'
                      ? 'bg-success/15 text-success'
                      : 'bg-warning/15 text-warning'
                  }`}
                >
                  {r.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Feature 4: Social Proof Live Feed ── */}
      <LiveFeedTicker prizes={prizes} />

      {/* ── Odds modal ── */}
      <AnimatePresence>
        {showOdds && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end bg-black/70"
            onClick={() => setShowOdds(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl p-6 max-h-[75vh] overflow-y-auto bg-card border border-border/50 border-b-0"
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
              <h2 className="text-lg font-bold text-foreground mb-4">{t('spin_odds_title')}</h2>
              <div className="space-y-2.5">
                {prizes.map((p: any) => {
                  const pct = totalWeight > 0 ? (p.weight / totalWeight) * 100 : 0
                  return (
                    <div key={p.id} className="p-3 rounded-xl bg-secondary/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                          />
                          <span className="text-sm text-foreground/80">{prizeName(p)}</span>
                          <RarityBadge weight={p.weight} totalWeight={totalWeight} />
                        </div>
                        <span className="text-sm font-bold text-primary">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs mt-4 text-center text-muted-foreground/50">
                Seed hash shown before spin • Verified with HMAC-SHA256 after
              </p>
              <button
                onClick={() => setShowOdds(false)}
                className="mt-4 w-full py-3 rounded-xl text-sm font-medium text-muted-foreground border border-border bg-secondary"
              >
                {t('spin_odds_close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result modal ── */}
      <AnimatePresence>
        {result && !spinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-black/85"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center bg-card border border-primary/40 shadow-2xl shadow-primary/20"
            >
              {result.prize ? (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="text-7xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground">{t('spin_result_title')}</h2>
                  <p className="mt-1 mb-5 text-sm text-muted-foreground/70">{t('spin_result_subtitle')}</p>

                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="inline-block px-6 py-3 rounded-2xl text-white text-xl font-bold mb-3"
                    style={{
                      background: result.prize.color ?? '#6c63ff',
                      boxShadow: `0 0 40px ${result.prize.color ?? '#6c63ff'}80`,
                    }}
                  >
                    {prizeName(result.prize)}
                  </motion.div>

                  {/* Rarity badge in result */}
                  <div className="mb-3">
                    <RarityBadge weight={result.prize.weight ?? 0} totalWeight={totalWeight} />
                  </div>

                  {result.prize.value > 0 && (
                    <p className="text-sm mb-2 text-muted-foreground/60">
                      {result.prize.value?.toLocaleString()} UZS
                    </p>
                  )}

                  {/* Claim code */}
                  {result.claim_code && (
                    <button
                      onClick={() => copyClaimCode(result.claim_code)}
                      className="mt-3 w-full py-3 rounded-xl font-mono text-sm flex items-center justify-center gap-2 transition-all bg-secondary border border-border text-foreground/90"
                    >
                      <span>{t('spin_claim_code')}:</span>
                      <span className="font-bold">{result.claim_code}</span>
                      <span>{copied ? '✅' : '📋'}</span>
                    </button>
                  )}

                  {/* Provably fair details */}
                  {result.seed && (
                    <details className="mt-3 text-left">
                      <summary className="text-xs cursor-pointer text-muted-foreground/60">
                        Verify fairness
                      </summary>
                      <div className="mt-2 rounded-xl p-3 text-xs font-mono break-all space-y-1 bg-secondary/50 text-foreground/80">
                        <p><span className="text-muted-foreground/50">Seed: </span>{result.seed}</p>
                        <p><span className="text-muted-foreground/50">Hash: </span>{result.seed_hash}</p>
                        <p><span className="text-muted-foreground/50">Nonce: </span>{result.nonce}</p>
                      </div>
                    </details>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3 rounded-xl text-sm font-medium text-primary border border-primary/30 bg-primary/15 transition-all"
                    >
                      📤 {t('spin_result_share')}
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary to-purple-500 shadow-lg shadow-primary/40"
                    >
                      {t('spin_result_close')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">😢</div>
                  <p className="text-foreground/70 font-medium text-lg">{t('spin_result_no_prize')}</p>
                  <button
                    onClick={() => setResult(null)}
                    className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary to-purple-500"
                  >
                    {t('spin_result_close')}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
