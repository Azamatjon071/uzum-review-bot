import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { t, prizeName } from '@/i18n'
import { getMyRewards } from '@/api'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'wallet_status_pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  claimed: { label: 'wallet_status_claimed', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  expired: { label: 'wallet_status_expired', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' },
}

export default function WalletPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => getMyRewards().then((r) => r.data),
  })

  const rewards: any[] = data?.rewards ?? []
  const totalPending = rewards
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + (r.prize?.value ?? 0), 0)
  const totalWon = rewards.reduce((s, r) => s + (r.prize?.value ?? 0), 0)

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="px-4 pt-6 pb-28 min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)' }}
    >
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-5"
      >
        {t('wallet_title')}
      </motion.h1>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)',
            boxShadow: '0 8px 32px rgba(108,99,255,0.35)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <p className="text-xs text-white/70 mb-1">{t('wallet_balance')}</p>
          <p className="text-xl font-bold text-white">{totalPending.toLocaleString()}</p>
          <p className="text-xs text-white/50 mt-0.5">UZS</p>
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
          <p className="text-xs mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('wallet_total_won')}</p>
          <p className="text-xl font-bold text-white">{totalWon.toLocaleString()}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(167,139,250,0.4)' }}>UZS</p>
        </div>
      </motion.div>

      {/* History */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="font-semibold mb-3 text-sm"
        style={{ color: 'rgba(167,139,250,0.7)' }}
      >
        {t('wallet_history')}
      </motion.h2>

      {rewards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-5xl mb-3">👛</div>
          <p style={{ color: 'rgba(200,190,255,0.4)' }}>{t('wallet_empty')}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {rewards.map((r: any, i: number) => {
            const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.expired
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{
                        background: r.prize?.color ?? '#6c63ff',
                        boxShadow: `0 4px 15px ${r.prize?.color ?? '#6c63ff'}60`,
                      }}
                    >
                      {r.prize?.value > 0 ? (r.prize.value.toLocaleString().slice(0, 4)) : '🎁'}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-white">{prizeName(r.prize) ?? '—'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(167,139,250,0.5)' }}>
                        {r.prize?.value?.toLocaleString()} UZS
                      </p>
                    </div>
                  </div>

                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ color: sc.color, background: sc.bg }}
                  >
                    {t(sc.label as any)}
                  </span>
                </div>

                {r.expires_at && r.status === 'pending' && (
                  <p className="text-xs mt-2.5 pl-14" style={{ color: 'rgba(251,191,36,0.5)' }}>
                    {t('wallet_reward_expires')}{' '}
                    {format(new Date(r.expires_at), 'dd.MM.yyyy')}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
