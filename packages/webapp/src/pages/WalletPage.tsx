import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Banknote, Wallet } from 'lucide-react'
import { t, prizeName } from '@/i18n'
import { getMyRewards, donateReward, getPublicCampaigns } from '@/api'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import { useViewPreferences } from '@/hooks/useViewPreferences'
import ViewToggle from '@/components/ui/ViewToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

type FilterType = 'all' | 'pending' | 'claimed' | 'expired'

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  claimed: 'success',
  expired: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'wallet_status_pending',
  claimed: 'wallet_status_claimed',
  expired: 'wallet_status_expired',
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const isExpired = isPast(new Date(expiresAt))
  if (isExpired) return null
  const dist = formatDistanceToNow(new Date(expiresAt), { addSuffix: false })
  return (
    <span className="text-xs font-medium text-warning">
      ⏰ {dist} {t('wallet_expiry_countdown')}
    </span>
  )
}

function RewardCard({ r, onDonate, i }: { r: any; onDonate: (r: any) => void; i: number }) {
  const [copied, setCopied] = useState(false)
  const variant = STATUS_VARIANT[r.status] ?? 'neutral'
  const label = STATUS_LABEL[r.status] ?? 'wallet_status_expired'

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
      className={`rounded-2xl p-4 ${
        r.status === 'pending'
          ? 'bg-primary/5 border border-primary/20'
          : 'bg-card border border-border'
      }`}
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
            <p className="font-semibold text-foreground text-sm">{prizeName(r.prize) ?? '—'}</p>
            {r.prize?.value > 0 && (
              <p className="text-xs mt-0.5 text-muted-foreground/60">
                {r.prize.value.toLocaleString()} UZS
              </p>
            )}
            <p className="text-xs mt-0.5 text-muted-foreground/40">
              {format(new Date(r.created_at), 'dd.MM.yyyy')}
            </p>
          </div>
        </div>
        <StatusBadge variant={variant}>
          {t(label as any)}
        </StatusBadge>
      </div>

      {/* Claim code */}
      {r.claim_code && r.status === 'pending' && (
        <button
          onClick={copyCode}
          className="mt-3 w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all bg-secondary border border-border"
        >
          <span className="text-xs text-muted-foreground/60">{t('wallet_claim_code')}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-foreground">{r.claim_code}</span>
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
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all bg-success/15 text-success border border-success/20"
          >
            🤲 {t('wallet_donate_reward')}
          </button>
        </div>
      )}
    </motion.div>
  )
}

function RewardListRow({ r, onDonate, i }: { r: any; onDonate: (r: any) => void; i: number }) {
  const variant = STATUS_VARIANT[r.status] ?? 'neutral'
  const label = STATUS_LABEL[r.status] ?? 'wallet_status_expired'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ background: r.prize?.color ?? '#6c63ff' }}
      >
        {r.prize?.value > 0 ? <Banknote className="w-4 h-4 text-white" /> : <Gift className="w-4 h-4 text-white" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{prizeName(r.prize) ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd.MM.yyyy')}</p>
      </div>
      <StatusBadge variant={variant}>{t(label as any)}</StatusBadge>
    </motion.div>
  )
}

export default function WalletPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')
  const [donatingReward, setDonatingReward] = useState<any>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [donateSuccess, setDonateSuccess] = useState(false)

  const view = useViewPreferences((s) => s.getView)('wallet', 'list')
  const setView = useViewPreferences((s) => s.setView)

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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground/60">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-28 min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-15 bg-primary/20 blur-[40px]" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('wallet_title')}</h1>
          <p className="text-sm mt-0.5 text-muted-foreground/50">
            {rewards.length} {t('wallet_history')}
          </p>
        </div>
        <ViewToggle
          current={view}
          onChange={(mode) => setView('wallet', mode)}
          options={['list', 'card']}
        />
      </motion.div>

      {/* Success banner */}
      <AnimatePresence>
        {donateSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl px-4 py-3 text-sm font-medium mb-4 text-center text-white bg-success shadow-lg shadow-success/30"
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
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-gradient-to-r from-primary to-purple-500 shadow-lg shadow-primary/30">
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/10" />
          <p className="text-[10px] text-white/70 mb-1">{t('wallet_balance')}</p>
          <p className="text-lg font-bold text-white leading-tight">{pendingValue.toLocaleString()}</p>
          <p className="text-[10px] text-white/50 mt-0.5">UZS</p>
        </div>

        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-secondary" />
          <p className="text-[10px] mb-1 text-muted-foreground/60">{t('wallet_won_count')}</p>
          <p className="text-lg font-bold text-foreground leading-tight">{pendingCount}</p>
          <p className="text-[10px] mt-0.5 text-warning/60">{t('wallet_status_pending')}</p>
        </div>

        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-secondary" />
          <p className="text-[10px] mb-1 text-muted-foreground/60">{t('wallet_claimed_count')}</p>
          <p className="text-lg font-bold text-foreground leading-tight">{claimedCount}</p>
          <p className="text-[10px] mt-0.5 text-success/60">{t('wallet_status_claimed')}</p>
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
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40'
                : 'bg-secondary text-muted-foreground border border-border'
            }`}
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
        <EmptyState
          icon={filter === 'pending' ? Gift : filter === 'claimed' ? Gift : Wallet}
          title={t('wallet_empty')}
          description={filter !== 'all' ? undefined : undefined}
          action={filter !== 'all' ? (
            <button
              onClick={() => setFilter('all')}
              className="text-sm underline text-muted-foreground/60 hover:text-primary transition-colors"
            >
              Show all
            </button>
          ) : undefined}
        />
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((r: any, i: number) =>
              view === 'list' ? (
                <RewardListRow key={r.id} r={r} onDonate={setDonatingReward} i={i} />
              ) : (
                <RewardCard key={r.id} r={r} onDonate={setDonatingReward} i={i} />
              )
            )}
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
            className="fixed inset-0 z-40 flex items-end bg-black/75"
            onClick={() => setDonatingReward(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl p-6 bg-card border border-border border-b-0"
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
              <h2 className="font-bold text-lg text-foreground mb-1">🤲 {t('wallet_donate_reward')}</h2>
              <p className="text-sm mb-5 text-muted-foreground/60">
                {prizeName(donatingReward?.prize)}
              </p>

              {campaigns.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs mb-2 text-muted-foreground/60">Choose campaign (optional)</p>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm text-foreground outline-none bg-secondary border border-border focus:border-primary"
                  >
                    <option value="" className="bg-card">General sadaqa fund</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={c.id} className="bg-card">
                        {c.name_uz}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDonatingReward(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground border border-border bg-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  disabled={donateMut.isPending}
                  onClick={() => donateMut.mutate({ rewardId: donatingReward.id, campaignId: selectedCampaign || undefined })}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-success/30"
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
