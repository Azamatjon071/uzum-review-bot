import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { t, prizeName } from '@/i18n'
import { getMyRewards, donateReward, getPublicCampaigns } from '@/api'
import { formatDistanceToNow, format, isPast } from 'date-fns'

const BG = 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)'

type FilterType = 'all' | 'pending' | 'claimed' | 'expired'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'wallet_status_pending' },
  claimed: { color: '#34d399', bg: 'rgba(52,211,153,0.15)', label: 'wallet_status_claimed' },
  expired: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)', label: 'wallet_status_expired' },
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const isExpired = isPast(new Date(expiresAt))
  if (isExpired) return null
  const dist = formatDistanceToNow(new Date(expiresAt), { addSuffix: false })
  return (
    <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>
      ⏰ {dist} {t('wallet_expiry_countdown')}
    </span>
  )
}

function RewardCard({ r, onDonate, i }: { r: any; onDonate: (r: any) => void; i: number }) {
  const [copied, setCopied] = useState(false)
  const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.expired

  function copyCode() {
    if (!r.claim_code) return
    navigator.clipboard.writeText(r.claim_code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl p-4"
      style={{
        background: r.status === 'pending'
          ? 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(168,85,247,0.08) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: r.status === 'pending'
          ? '1px solid rgba(108,99,255,0.3)'
          : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{
              background: r.prize?.color ?? '#6c63ff',
              boxShadow: `0 4px 15px ${r.prize?.color ?? '#6c63ff'}50`,
            }}
          >
            {r.prize?.value > 0 ? '💰' : '🎁'}
          </span>
          <div>
            <p className="font-semibold text-white text-sm">{prizeName(r.prize) ?? '—'}</p>
            {r.prize?.value > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(167,139,250,0.6)' }}>
                {r.prize.value.toLocaleString()} UZS
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {format(new Date(r.created_at), 'dd.MM.yyyy')}
            </p>
          </div>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
          style={{ color: sc.color, background: sc.bg }}
        >
          {t(sc.label as any)}
        </span>
      </div>

      {/* Claim code */}
      {r.claim_code && r.status === 'pending' && (
        <button
          onClick={copyCode}
          className="mt-3 w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="text-xs" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('wallet_claim_code')}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white">{r.claim_code}</span>
            <span className="text-sm">{copied ? '✅' : '📋'}</span>
          </div>
        </button>
      )}

      {/* Expiry & actions */}
      {r.status === 'pending' && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            {r.expires_at && <ExpiryCountdown expiresAt={r.expires_at} />}
          </div>
          <button
            onClick={() => onDonate(r)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            🤲 {t('wallet_donate_reward')}
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default function WalletPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')
  const [donatingReward, setDonatingReward] = useState<any>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [donateSuccess, setDonateSuccess] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => getMyRewards().then((r) => r.data),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['public-campaigns'],
    queryFn: () => getPublicCampaigns().then((r) => r.data),
    enabled: !!donatingReward,
  })

  const donateMut = useMutation({
    mutationFn: ({ rewardId, campaignId }: { rewardId: string; campaignId?: string }) =>
      donateReward(rewardId, campaignId),
    onSuccess: () => {
      setDonateSuccess(true)
      setDonatingReward(null)
      qc.invalidateQueries({ queryKey: ['rewards'] })
      setTimeout(() => setDonateSuccess(false), 3000)
    },
  })

  const rewards: any[] = data?.rewards ?? []

  const filtered = useMemo(() => {
    let r = [...rewards]
    if (filter !== 'all') r = r.filter((rew) => rew.status === filter)
    // Sort: pending first, then claimed, then expired
    return r.sort((a, b) => {
      const order = { pending: 0, claimed: 1, expired: 2 }
      return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3)
    })
  }, [rewards, filter])

  const pendingCount = rewards.filter((r) => r.status === 'pending').length
  const claimedCount = rewards.filter((r) => r.status === 'claimed').length
  const totalValue = rewards.reduce((s, r) => s + (r.prize?.value ?? 0), 0)
  const pendingValue = rewards.filter((r) => r.status === 'pending').reduce((s, r) => s + (r.prize?.value ?? 0), 0)

  const campaigns = campaignsData?.campaigns ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-28 min-h-screen" style={{ background: BG }}>
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-15"
        style={{ background: 'radial-gradient(circle, #6c63ff 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl font-bold text-white">{t('wallet_title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(167,139,250,0.5)' }}>
          {rewards.length} {t('wallet_history')}
        </p>
      </motion.div>

      {/* Success banner */}
      <AnimatePresence>
        {donateSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl px-4 py-3 text-sm font-medium mb-4 text-center text-white"
            style={{ background: 'linear-gradient(90deg, #059669, #10b981)', boxShadow: '0 8px 25px rgba(16,185,129,0.3)' }}
          >
            🤲 {t('wallet_donated')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-2.5 mb-5"
      >
        <div
          className="rounded-2xl p-3.5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(108,99,255,0.35)' }}
        >
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/10" />
          <p className="text-[10px] text-white/70 mb-1">{t('wallet_balance')}</p>
          <p className="text-lg font-bold text-white leading-tight">{pendingValue.toLocaleString()}</p>
          <p className="text-[10px] text-white/50 mt-0.5">UZS</p>
        </div>

        <div
          className="rounded-2xl p-3.5 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('wallet_won_count')}</p>
          <p className="text-lg font-bold text-white leading-tight">{pendingCount}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(251,191,36,0.6)' }}>{t('wallet_status_pending')}</p>
        </div>

        <div
          className="rounded-2xl p-3.5 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('wallet_claimed_count')}</p>
          <p className="text-lg font-bold text-white leading-tight">{claimedCount}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(52,211,153,0.6)' }}>{t('wallet_status_claimed')}</p>
        </div>
      </motion.div>

      {/* Filter pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-5 overflow-x-auto pb-1"
      >
        {(['all', 'pending', 'claimed', 'expired'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={filter === f
              ? { background: 'linear-gradient(90deg, #6c63ff, #a855f7)', color: 'white', boxShadow: '0 4px 12px rgba(108,99,255,0.4)' }
              : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {f === 'all' ? t('wallet_filter_all')
              : f === 'pending' ? `${t('wallet_filter_pending')} ${pendingCount > 0 ? `(${pendingCount})` : ''}`
              : f === 'claimed' ? t('wallet_filter_claimed')
              : t('wallet_status_expired')}
          </button>
        ))}
      </motion.div>

      {/* Rewards list */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="text-6xl mb-4">
            {filter === 'pending' ? '🎯' : filter === 'claimed' ? '✅' : '👛'}
          </div>
          <p className="font-semibold" style={{ color: 'rgba(200,190,255,0.5)' }}>{t('wallet_empty')}</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-3 text-sm underline"
              style={{ color: 'rgba(167,139,250,0.6)' }}
            >
              Show all
            </button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((r: any, i: number) => (
              <RewardCard key={r.id} r={r} onDonate={setDonatingReward} i={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Donate reward modal */}
      <AnimatePresence>
        {donatingReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setDonatingReward(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl p-6"
              style={{ background: 'linear-gradient(180deg, #1e1b3a 0%, #15122d 100%)', border: '1px solid rgba(108,99,255,0.2)', borderBottom: 'none' }}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <h2 className="font-bold text-lg text-white mb-1">🤲 {t('wallet_donate_reward')}</h2>
              <p className="text-sm mb-5" style={{ color: 'rgba(167,139,250,0.6)' }}>
                {prizeName(donatingReward?.prize)}
              </p>

              {campaigns.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs mb-2" style={{ color: 'rgba(167,139,250,0.6)' }}>Choose campaign (optional)</p>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <option value="" style={{ background: '#1a1a2e' }}>General sadaqa fund</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>
                        {c.name_uz}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDonatingReward(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {t('cancel')}
                </button>
                <button
                  disabled={donateMut.isPending}
                  onClick={() => donateMut.mutate({ rewardId: donatingReward.id, campaignId: selectedCampaign || undefined })}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, #059669, #10b981)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
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
