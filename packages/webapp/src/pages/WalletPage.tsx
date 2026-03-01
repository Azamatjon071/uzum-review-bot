import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Banknote, Wallet, TrendingUp, CheckCircle, Clock, ChevronRight } from 'lucide-react'
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
    <span className="text-xs font-medium text-warning flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {dist} {t('wallet_expiry_countdown')}
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

  const prizeColor = r.prize?.color ?? '#6c63ff'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.04 }}
      className={`rounded-2xl overflow-hidden border ${
        r.status === 'pending'
          ? 'bg-card border-primary/20'
          : 'bg-card border-border'
      }`}
    >
      {/* Color accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: prizeColor, opacity: r.status === 'claimed' ? 0.4 : 0.8 }}
      />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Prize color swatch */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{
                background: `linear-gradient(135deg, ${prizeColor}cc, ${prizeColor})`,
                boxShadow: `0 4px 16px ${prizeColor}40`,
              }}
            >
              {r.prize?.value > 0
                ? <Banknote className="w-5 h-5" />
                : <Gift className="w-5 h-5" />
              }
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-snug">{prizeName(r.prize) ?? '—'}</p>
              {r.prize?.value > 0 && (
                <p className="text-xs mt-0.5 font-bold" style={{ color: prizeColor }}>
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

        {/* Claim code row */}
        {r.claim_code && r.status === 'pending' && (
          <button
            onClick={copyCode}
            className="mt-3 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all bg-secondary border border-border active:scale-[0.99]"
          >
            <span className="text-xs text-muted-foreground/50">{t('wallet_claim_code')}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground tracking-wider">{r.claim_code}</span>
              <span className="text-base">{copied ? '✅' : '📋'}</span>
            </div>
          </button>
        )}

        {/* Expiry & donate row */}
        {r.status === 'pending' && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              {r.expires_at && <ExpiryCountdown expiresAt={r.expires_at} />}
            </div>
            <button
              onClick={() => onDonate(r)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all bg-success/12 text-success border border-success/20 flex items-center gap-1"
            >
              🤲 {t('wallet_donate_reward')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RewardListRow({ r, onDonate, i }: { r: any; onDonate: (r: any) => void; i: number }) {
  const variant = STATUS_VARIANT[r.status] ?? 'neutral'
  const label = STATUS_LABEL[r.status] ?? 'wallet_status_expired'
  const prizeColor = r.prize?.color ?? '#6c63ff'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: i * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
    >
      {/* Color swatch dot */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${prizeColor}22`, border: `1.5px solid ${prizeColor}44` }}
      >
        {r.prize?.value > 0
          ? <Banknote className="w-4 h-4" style={{ color: prizeColor }} />
          : <Gift className="w-4 h-4" style={{ color: prizeColor }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{prizeName(r.prize) ?? '—'}</p>
        <p className="text-xs text-muted-foreground/50">{format(new Date(r.created_at), 'dd.MM.yyyy')}</p>
      </div>
      <StatusBadge variant={variant}>{t(label as any)}</StatusBadge>
      {r.status === 'pending' && (
        <button
          onClick={() => onDonate(r)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-success/10 text-success border border-success/15 shrink-0"
        >
          🤲
        </button>
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
    return r.sort((a, b) => {
      const order = { pending: 0, claimed: 1, expired: 2 }
      return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3)
    })
  }, [rewards, filter])

  const pendingCount = rewards.filter((r) => r.status === 'pending').length
  const claimedCount = rewards.filter((r) => r.status === 'claimed').length
  const pendingValue = rewards.filter((r) => r.status === 'pending').reduce((s, r) => s + (r.prize?.value ?? 0), 0)

  const campaigns = campaignsData?.campaigns ?? []

  const FILTER_TABS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: t('wallet_filter_all'), count: rewards.length },
    { key: 'pending', label: t('wallet_filter_pending'), count: pendingCount },
    { key: 'claimed', label: t('wallet_filter_claimed'), count: claimedCount },
    { key: 'expired', label: t('wallet_status_expired') },
  ]

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
    <div className="px-4 pt-4 pb-28 min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-10 bg-primary/30 blur-[50px]" />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-start justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #7000FF, #e8007c)' }}
          >
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">{t('wallet_title')}</h1>
            <p className="text-xs text-muted-foreground/50 leading-tight">
              {rewards.length} {t('wallet_history')}
            </p>
          </div>
        </div>
        <ViewToggle
          current={view}
          onChange={(mode) => setView('wallet', mode)}
          options={['list', 'card']}
        />
      </motion.div>

      {/* ── Success banner ── */}
      <AnimatePresence>
        {donateSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl px-4 py-3 text-sm font-semibold mb-4 text-center text-white flex items-center justify-center gap-2 bg-success shadow-lg shadow-success/25"
          >
            🤲 {t('wallet_donated')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-2.5 mb-5"
      >
        {/* Balance — gradient hero card */}
        <div
          className="rounded-2xl p-3.5 relative overflow-hidden col-span-1 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7000FF, #e8007c)', boxShadow: '0 4px 20px rgba(112,0,255,0.3)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
          <TrendingUp className="w-4 h-4 text-white/70 mb-1.5" />
          <p className="text-[10px] text-white/60 mb-0.5 font-medium">{t('wallet_balance')}</p>
          <p className="text-lg font-bold text-white leading-tight">{pendingValue.toLocaleString()}</p>
          <p className="text-[9px] text-white/40 mt-0.5 font-medium">UZS</p>
        </div>

        {/* Pending count */}
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-warning/10" />
          <Clock className="w-4 h-4 text-warning/70 mb-1.5" />
          <p className="text-[10px] mb-0.5 font-medium text-muted-foreground/50">{t('wallet_won_count')}</p>
          <p className="text-lg font-bold text-warning leading-tight">{pendingCount}</p>
          <p className="text-[9px] mt-0.5 text-warning/40 font-medium">{t('wallet_status_pending')}</p>
        </div>

        {/* Claimed count */}
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-success/10" />
          <CheckCircle className="w-4 h-4 text-success/70 mb-1.5" />
          <p className="text-[10px] mb-0.5 font-medium text-muted-foreground/50">{t('wallet_claimed_count')}</p>
          <p className="text-lg font-bold text-success leading-tight">{claimedCount}</p>
          <p className="text-[9px] mt-0.5 text-success/40 font-medium">{t('wallet_status_claimed')}</p>
        </div>
      </motion.div>

      {/* ── Filter chips ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTER_TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === key
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                : 'bg-secondary text-muted-foreground border border-border'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  filter === key ? 'bg-primary/30 text-primary' : 'bg-border text-muted-foreground/60'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Rewards list / cards ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={filter === 'pending' ? Gift : filter === 'claimed' ? CheckCircle : Wallet}
          title={t('wallet_empty')}
          action={filter !== 'all' ? (
            <button
              onClick={() => setFilter('all')}
              className="text-sm flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
            >
              {t('wallet_filter_all')} <ChevronRight className="w-3.5 h-3.5" />
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

      {/* ── Donate bottom sheet ── */}
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

              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/15 border border-success/20">
                  🤲
                </div>
                <div>
                  <h2 className="font-bold text-base text-foreground">{t('wallet_donate_reward')}</h2>
                  <p className="text-xs text-muted-foreground/60">
                    {prizeName(donatingReward?.prize)}
                  </p>
                </div>
              </div>

              {campaigns.length > 0 && (
                <div className="mt-4 mb-4">
                  <p className="text-xs mb-2 font-medium text-muted-foreground/60">Choose campaign (optional)</p>
                  <div className="space-y-2">
                    {/* General fund option */}
                    <button
                      onClick={() => setSelectedCampaign('')}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all border ${
                        selectedCampaign === ''
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-secondary border-border text-foreground/70'
                      }`}
                    >
                      <span>General sadaqa fund</span>
                      {selectedCampaign === '' && <CheckCircle className="w-4 h-4" />}
                    </button>
                    {campaigns.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCampaign(c.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all border ${
                          selectedCampaign === c.id
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-secondary border-border text-foreground/70'
                        }`}
                      >
                        <span>{c.name_uz}</span>
                        {selectedCampaign === c.id && <CheckCircle className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setDonatingReward(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground border border-border bg-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  disabled={donateMut.isPending}
                  onClick={() => donateMut.mutate({ rewardId: donatingReward.id, campaignId: selectedCampaign || undefined })}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-success/25"
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
