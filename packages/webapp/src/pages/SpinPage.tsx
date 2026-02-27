import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { t, prizeName } from '@/i18n'
import { getSpinCommitments, commitSpin, executeSpin, getPrizeOdds } from '@/api'
import PrizeWheel from '@/components/wheel/PrizeWheel'

const PLACEHOLDER_SEGMENTS = [
  { id: 1, name_uz: '…', name_ru: '…', name_en: '…', color: '#6c63ff', weight: 10 },
  { id: 2, name_uz: '…', name_ru: '…', name_en: '…', color: '#10b981', weight: 10 },
  { id: 3, name_uz: '…', name_ru: '…', name_en: '…', color: '#f59e0b', weight: 10 },
  { id: 4, name_uz: '…', name_ru: '…', name_en: '…', color: '#ef4444', weight: 10 },
  { id: 5, name_uz: '…', name_ru: '…', name_en: '…', color: '#8b5cf6', weight: 10 },
  { id: 6, name_uz: '…', name_ru: '…', name_en: '…', color: '#06b6d4', weight: 10 },
]

export default function SpinPage() {
  const qc = useQueryClient()
  const [spinning, setSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [showOdds, setShowOdds] = useState(false)
  const [activeCommitment, setActiveCommitment] = useState<any>(null)

  const { data: commitmentsData } = useQuery({
    queryKey: ['spin-commitments'],
    queryFn: () => getSpinCommitments().then((r) => r.data),
  })

  const { data: oddsData } = useQuery({
    queryKey: ['prize-odds'],
    queryFn: () => getPrizeOdds().then((r) => r.data),
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
    },
  })

  const pendingCommitments = (commitmentsData?.commitments ?? []).filter(
    (c: any) => c.status === 'pending'
  )
  const prizes: any[] = oddsData?.prizes ?? PLACEHOLDER_SEGMENTS
  const totalWeight = prizes.reduce((s: number, p: any) => s + p.weight, 0)

  function handleSpin() {
    if (spinning || pendingCommitments.length === 0) return
    const commitment = activeCommitment ?? pendingCommitments[0]
    spinMut.mutate(commitment.id)
  }

  function handleSpinEnd() {
    setSpinning(false)
    qc.invalidateQueries({ queryKey: ['spin-commitments'] })
    qc.invalidateQueries({ queryKey: ['rewards'] })
  }

  const hasSpins = pendingCommitments.length > 0

  return (
    <div className="flex flex-col items-center pb-24 pt-6 px-4 min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)' }}
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6c63ff 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* Header */}
      <div className="text-center mb-5 relative z-10">
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
          className="text-sm mt-1"
          style={{ color: 'rgba(200,190,255,0.6)' }}
        >
          {t('spin_subtitle')}
        </motion.p>
      </div>

      {/* Spin count badge */}
      {hasSpins && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-5 relative z-10"
        >
          <div
            className="px-5 py-1.5 rounded-full text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(90deg, #6c63ff, #a78bfa)',
              boxShadow: '0 0 20px rgba(108,99,255,0.5)',
            }}
          >
            {t('spin_available')}: {pendingCommitments.length}
          </div>
        </motion.div>
      )}

      {/* Wheel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10"
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
              className={[
                'w-full text-white font-bold py-4 rounded-2xl text-lg transition-all relative overflow-hidden',
                !spinning && !spinMut.isPending ? 'btn-glow' : 'opacity-60',
              ].join(' ')}
              style={{
                background: spinning || spinMut.isPending
                  ? 'rgba(108,99,255,0.4)'
                  : 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)',
              }}
            >
              {spinning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Spinning…</span>
                </span>
              ) : t('spin_button')}
            </motion.button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 px-6 rounded-2xl border border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="text-4xl mb-3">🎡</div>
            <p className="font-semibold text-white/70">{t('spin_no_spins')}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(200,190,255,0.4)' }}>{t('spin_no_spins_sub')}</p>
          </motion.div>
        )}
      </div>

      {/* Provably fair link */}
      <button
        onClick={() => setShowOdds(true)}
        className="mt-5 text-xs transition-colors relative z-10"
        style={{ color: 'rgba(167,139,250,0.6)' }}
      >
        {t('spin_fair_info')}
      </button>

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
              {/* Handle bar */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <h2 className="text-lg font-bold text-white mb-4">{t('spin_odds_title')}</h2>
              <div className="space-y-2.5">
                {prizes.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                      />
                      <span className="text-sm text-white/80">{prizeName(p)}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#a78bfa' }}>
                      {totalWeight > 0 ? ((p.weight / totalWeight) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
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
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center"
              style={{
                background: 'linear-gradient(160deg, #1e1b3a 0%, #15122d 100%)',
                border: '1px solid rgba(108,99,255,0.3)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(108,99,255,0.15)',
              }}
            >
              {result.prize ? (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">{t('spin_result_title')}</h2>
                  <p className="mt-1 mb-5 text-sm" style={{ color: 'rgba(167,139,250,0.7)' }}>{t('spin_result_subtitle')}</p>

                  <div
                    className="inline-block px-6 py-3 rounded-2xl text-white text-lg font-bold"
                    style={{
                      background: result.prize.color ?? '#6c63ff',
                      boxShadow: `0 0 30px ${result.prize.color ?? '#6c63ff'}80`,
                    }}
                  >
                    {prizeName(result.prize)}
                  </div>
                  {result.prize.value > 0 && (
                    <p className="text-sm mt-2" style={{ color: 'rgba(167,139,250,0.6)' }}>
                      {result.prize.value?.toLocaleString()} UZS
                    </p>
                  )}

                  {result.seed && (
                    <details className="mt-4 text-left">
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
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">😢</div>
                  <p className="text-white/70 font-medium">{t('spin_result_no_prize')}</p>
                </>
              )}

              <button
                onClick={() => setResult(null)}
                className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)',
                  boxShadow: '0 4px 15px rgba(108,99,255,0.4)',
                }}
              >
                {t('spin_result_close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
