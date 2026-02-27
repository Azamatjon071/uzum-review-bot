import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { t, prizeName } from '@/i18n'
import { getPublicCampaigns, donateToCapmaign, giveSadaqa, getCharityLeaderboard } from '@/api'

export default function CharityPage() {
  const qc = useQueryClient()
  const [donatingTo, setDonatingTo] = useState<any>(null)
  const [donateAmount, setDonateAmount] = useState('')
  const [sadaqaAmount, setSadaqaAmount] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tab, setTab] = useState<'campaigns' | 'leaderboard'>('campaigns')

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['public-campaigns'],
    queryFn: () => getPublicCampaigns().then((r) => r.data),
  })

  const { data: leaderboardData } = useQuery({
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
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  const sadaqaMut = useMutation({
    mutationFn: (amount: number) => giveSadaqa(amount),
    onSuccess: () => {
      setSuccessMsg(t('charity_success'))
      setSadaqaAmount('')
      qc.invalidateQueries({ queryKey: ['rewards'] })
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  const campaigns: any[] = campaignsData?.campaigns ?? []
  const leaderboard: any[] = leaderboardData?.leaderboard ?? []

  const MEDAL_STYLES = [
    { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', shadow: 'rgba(251,191,36,0.5)' },
    { bg: 'linear-gradient(135deg, #d1d5db, #9ca3af)', shadow: 'rgba(209,213,219,0.4)' },
    { bg: 'linear-gradient(135deg, #d97706, #b45309)', shadow: 'rgba(180,83,9,0.4)' },
  ]

  return (
    <div
      className="px-4 pt-6 pb-28 min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #0f1a1a 50%, #0a1a0f 100%)' }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t('charity_title')}</h1>
        <p className="text-sm mt-1 mb-5" style={{ color: 'rgba(167,239,200,0.5)' }}>{t('charity_subtitle')}</p>
      </motion.div>

      {/* Success banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl px-4 py-3 text-sm font-medium mb-4 text-center text-white"
            style={{
              background: 'linear-gradient(90deg, #059669, #10b981)',
              boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
            }}
          >
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sadaqa card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl p-5 mb-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          border: '1px solid rgba(16,185,129,0.3)',
          boxShadow: '0 8px 32px rgba(5,150,105,0.25)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🤲</span>
            <h2 className="font-bold text-lg text-white">{t('charity_sadaqa_title')}</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'rgba(167,243,208,0.7)' }}>{t('charity_sadaqa_desc')}</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('charity_sadaqa_placeholder')}
              value={sadaqaAmount}
              onChange={(e) => setSadaqaAmount(e.target.value)}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <button
              disabled={!sadaqaAmount || sadaqaMut.isPending}
              onClick={() => sadaqaMut.mutate(Number(sadaqaAmount))}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 text-emerald-800"
              style={{ background: 'rgba(167,243,208,0.9)' }}
            >
              {t('charity_sadaqa_btn')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div
        className="flex p-1 rounded-xl mb-5"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {([['campaigns', t('charity_title')], ['leaderboard', t('charity_leaderboard')]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === key
              ? { background: 'linear-gradient(90deg, #059669, #10b981)', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }
              : { color: 'rgba(167,243,208,0.5)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Campaigns tab */}
      {tab === 'campaigns' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🤲</div>
              <p style={{ color: 'rgba(167,243,208,0.4)' }}>{t('charity_no_campaigns')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((c: any, i: number) => {
                const pct = c.goal_amount > 0
                  ? Math.min(100, (c.raised_amount / c.goal_amount) * 100)
                  : 0
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-2xl p-5"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(16,185,129,0.15)',
                    }}
                  >
                    <h3 className="font-semibold text-white mb-1">{prizeName(c)}</h3>
                    {c.description_uz && (
                      <p className="text-sm mb-3 leading-relaxed" style={{ color: 'rgba(167,243,208,0.6)' }}>
                        {c.description_uz}
                      </p>
                    )}

                    {c.goal_amount > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(167,243,208,0.5)' }}>
                          <span>{c.raised_amount?.toLocaleString()} UZS {t('charity_raised')}</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-2 rounded-full"
                            style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }}
                          />
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'rgba(167,243,208,0.4)' }}>
                          {c.goal_amount?.toLocaleString()} UZS {t('charity_goal')} • {c.donor_count ?? 0} {t('charity_donors')}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setDonatingTo(c)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-98"
                      style={{
                        background: 'linear-gradient(90deg, #059669, #10b981)',
                        boxShadow: '0 4px 15px rgba(16,185,129,0.25)',
                      }}
                    >
                      {t('charity_donate_btn')}
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div className="space-y-2">
          {leaderboard.map((entry: any, i: number) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-2xl p-3.5"
              style={{
                background: i < 3 ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i < 3 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={i < 3
                  ? { background: MEDAL_STYLES[i].bg, boxShadow: `0 4px 12px ${MEDAL_STYLES[i].shadow}`, color: 'white' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                }
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {entry.first_name ?? entry.user_id}
                </p>
              </div>
              <span className="text-sm font-bold" style={{ color: '#34d399' }}>
                {entry.total_donated?.toLocaleString()} UZS
              </span>
            </motion.div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'rgba(167,243,208,0.4)' }}>
              {t('charity_no_campaigns')}
            </p>
          )}
        </div>
      )}

      {/* Donate modal */}
      <AnimatePresence>
        {donatingTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setDonatingTo(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
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
              <h2 className="font-bold text-lg text-white mb-1">{t('charity_donate_btn')}</h2>
              <p className="text-sm mb-5" style={{ color: 'rgba(167,243,208,0.6)' }}>{prizeName(donatingTo)}</p>
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
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
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
