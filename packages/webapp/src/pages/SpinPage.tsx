import { useState, useEffect } from 'react'
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

const BG = 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)'

// Confetti particle
function Confetti() {
  const colors = ['#6c63ff', '#a78bfa', '#fbbf24', '#34d399', '#f472b6', '#60a5fa']
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            background: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: '-10px',
          }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 1.5,
            delay: Math.random() * 0.8,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
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
  const meData = commitmentsData?.me

  return (
    <div className="flex flex-col items-center pb-24 pt-6 px-4 min-h-screen relative overflow-hidden"
      style={{ background: BG }}
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6c63ff 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <div className="absolute bottom-1/3 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', filter: 'blur(30px)' }}
      />

      {showConfetti && <Confetti />}

      {/* Header row */}
      <div className="w-full flex items-start justify-between mb-3 relative z-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white tracking-tight"
          >
            {t('spin_title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm mt-0.5"
            style={{ color: 'rgba(200,190,255,0.6)' }}
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
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}
            >
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
        <div
          className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)' }}
        >
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-xs" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('spin_available')}</p>
            <p className="text-xl font-bold text-white">{pendingCommitments.length}</p>
          </div>
        </div>
        <div
          className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('spin_total_spins')}</p>
            <p className="text-xl font-bold text-white">{rewardsData?.rewards?.length ?? 0}</p>
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
                className="w-full rounded-xl px-4 py-3 text-sm mb-3 text-white border border-white/10 focus:outline-none focus:border-violet-500"
                style={{ background: 'rgba(255,255,255,0.07)' }}
                value={activeCommitment?.id ?? ''}
                onChange={(e) => {
                  const c = pendingCommitments.find((c: any) => c.id === e.target.value)
                  setActiveCommitment(c ?? null)
                }}
              >
                {pendingCommitments.map((c: any) => (
                  <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>
                    #{c.id.slice(0, 8)} — {new Date(c.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={spinning || spinMut.isPending}
              onClick={handleSpin}
              className="w-full text-white font-bold py-4 rounded-2xl text-lg transition-all relative overflow-hidden"
              style={{
                background: spinning || spinMut.isPending
                  ? 'rgba(108,99,255,0.4)'
                  : 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)',
                boxShadow: !spinning && !spinMut.isPending ? '0 0 30px rgba(108,99,255,0.5), 0 4px 15px rgba(108,99,255,0.4)' : 'none',
              }}
            >
              {spinning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Spinning…</span>
                </span>
              ) : spinMut.isPending ? t('spin_prepare') : t('spin_button')}
            </motion.button>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 px-6 rounded-2xl border border-white/10 mb-3"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="text-4xl mb-3">🎡</div>
              <p className="font-semibold text-white/70">{t('spin_no_spins')}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(200,190,255,0.4)' }}>{t('spin_no_spins_sub')}</p>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => commitMut.mutate()}
              disabled={commitMut.isPending}
              className="w-full py-3 rounded-2xl text-sm font-medium text-white/70 border border-white/10 transition-all hover:border-violet-500/50"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {commitMut.isPending ? t('spin_prepare') : t('spin_commit_btn')}
            </motion.button>
          </>
        )}
      </div>

      {/* Provably fair link */}
      <button
        onClick={() => setShowOdds(true)}
        className="mt-5 text-xs transition-colors relative z-10 underline underline-offset-2"
        style={{ color: 'rgba(167,139,250,0.5)' }}
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
          <p className="text-xs mb-2 font-medium" style={{ color: 'rgba(167,139,250,0.6)' }}>
            {t('spin_recent_wins')}
          </p>
          <div className="space-y-2">
            {recentWins.map((r: any, i: number) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className="flex items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span
                  className="w-6 h-6 rounded-full shrink-0"
                  style={{ background: r.prize?.color ?? '#6c63ff', boxShadow: `0 0 8px ${r.prize?.color ?? '#6c63ff'}60` }}
                />
                <span className="text-xs text-white/70 flex-1 truncate">{prizeName(r.prize) ?? '—'}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: r.status === 'claimed' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: r.status === 'claimed' ? '#34d399' : '#fbbf24' }}
                >
                  {r.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Odds modal ── */}
      <AnimatePresence>
        {showOdds && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowOdds(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl p-6 max-h-[75vh] overflow-y-auto"
              style={{ background: 'linear-gradient(180deg, #1e1b3a 0%, #15122d 100%)', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <h2 className="text-lg font-bold text-white mb-4">{t('spin_odds_title')}</h2>
              <div className="space-y-2.5">
                {prizes.map((p: any) => {
                  const pct = totalWeight > 0 ? (p.weight / totalWeight) * 100 : 0
                  return (
                    <div key={p.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                          <span className="text-sm text-white/80">{prizeName(p)}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs mt-4 text-center" style={{ color: 'rgba(167,139,250,0.5)' }}>
                Seed hash shown before spin • Verified with HMAC-SHA256 after
              </p>
              <button
                onClick={() => setShowOdds(false)}
                className="mt-4 w-full py-3 rounded-xl text-sm font-medium text-white/70 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.06)' }}
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
            className="fixed inset-0 z-30 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center"
              style={{
                background: 'linear-gradient(160deg, #1e1b3a 0%, #15122d 100%)',
                border: '1px solid rgba(108,99,255,0.4)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(108,99,255,0.2)',
              }}
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
                  <h2 className="text-2xl font-bold text-white">{t('spin_result_title')}</h2>
                  <p className="mt-1 mb-5 text-sm" style={{ color: 'rgba(167,139,250,0.7)' }}>{t('spin_result_subtitle')}</p>

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

                  {result.prize.value > 0 && (
                    <p className="text-sm mb-2" style={{ color: 'rgba(167,139,250,0.6)' }}>
                      {result.prize.value?.toLocaleString()} UZS
                    </p>
                  )}

                  {/* Claim code */}
                  {result.claim_code && (
                    <button
                      onClick={() => copyClaimCode(result.claim_code)}
                      className="mt-3 w-full py-3 rounded-xl font-mono text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(200,190,255,0.9)' }}
                    >
                      <span>{t('spin_claim_code')}:</span>
                      <span className="font-bold">{result.claim_code}</span>
                      <span>{copied ? '✅' : '📋'}</span>
                    </button>
                  )}

                  {/* Provably fair details */}
                  {result.seed && (
                    <details className="mt-3 text-left">
                      <summary className="text-xs cursor-pointer" style={{ color: 'rgba(167,139,250,0.6)' }}>
                        Verify fairness
                      </summary>
                      <div className="mt-2 rounded-xl p-3 text-xs font-mono break-all space-y-1"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(200,190,255,0.8)' }}
                      >
                        <p><span style={{ color: 'rgba(167,139,250,0.5)' }}>Seed: </span>{result.seed}</p>
                        <p><span style={{ color: 'rgba(167,139,250,0.5)' }}>Hash: </span>{result.seed_hash}</p>
                        <p><span style={{ color: 'rgba(167,139,250,0.5)' }}>Nonce: </span>{result.nonce}</p>
                      </div>
                    </details>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3 rounded-xl text-sm font-medium text-white border border-violet-500/30 transition-all"
                      style={{ background: 'rgba(108,99,255,0.15)' }}
                    >
                      📤 {t('spin_result_share')}
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                      style={{
                        background: 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)',
                        boxShadow: '0 4px 15px rgba(108,99,255,0.4)',
                      }}
                    >
                      {t('spin_result_close')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">😢</div>
                  <p className="text-white/70 font-medium text-lg">{t('spin_result_no_prize')}</p>
                  <button
                    onClick={() => setResult(null)}
                    className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)' }}
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
