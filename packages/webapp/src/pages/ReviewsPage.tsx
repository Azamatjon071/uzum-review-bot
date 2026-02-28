import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { t } from '@/i18n'
import { getMySubmissions } from '@/api'
import { format } from 'date-fns'

const BG = 'linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)'

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_CONFIG: Record<string, { color: string; bg: string; emoji: string; labelKey: string }> = {
  pending:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',    emoji: '⏳', labelKey: 'reviews_status_pending' },
  approved:  { color: '#34d399', bg: 'rgba(52,211,153,0.15)',   emoji: '✅', labelKey: 'reviews_status_approved' },
  rejected:  { color: '#f87171', bg: 'rgba(248,113,113,0.15)',  emoji: '❌', labelKey: 'reviews_status_rejected' },
  duplicate: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', emoji: '♻️', labelKey: 'reviews_status_duplicate' },
}

function ReviewCard({ s, i }: { s: any; i: number }) {
  const [expanded, setExpanded] = useState(false)
  const status = s.status ?? 'pending'
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const createdDate = s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy') : '—'
  const shortId = String(s.id ?? '').slice(0, 8).toUpperCase()

  // Product name (multilingual, fall back gracefully)
  const product = s.product
  const productName = product
    ? (product.name_uz ?? product.name_ru ?? product.name_en ?? '—')
    : (s.product_url ? s.product_url : '—')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: status === 'approved'
          ? 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.05) 100%)'
          : status === 'pending'
          ? 'linear-gradient(135deg, rgba(108,99,255,0.1) 0%, rgba(168,85,247,0.06) 100%)'
          : 'rgba(255,255,255,0.04)',
        border: status === 'approved'
          ? '1px solid rgba(52,211,153,0.2)'
          : status === 'pending'
          ? '1px solid rgba(108,99,255,0.25)'
          : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Main row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Status icon + info */}
          <div className="flex items-start gap-3">
            <span
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ background: sc.bg }}
            >
              {sc.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate max-w-[180px]">
                {productName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(167,139,250,0.55)' }}>
                ID: <span className="font-mono">{shortId}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {t('reviews_submitted_on')} {createdDate}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ color: sc.color, background: sc.bg }}
            >
              {t(sc.labelKey as any)}
            </span>
            {s.spin_granted && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }}
              >
                🎡 {t('reviews_spin_granted')}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 space-y-2 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {/* Full product URL if no product entity */}
              {!product && s.product_url && (
                <p className="text-xs break-all" style={{ color: 'rgba(167,139,250,0.6)' }}>
                  {s.product_url}
                </p>
              )}

              {/* Rejection reason */}
              {(status === 'rejected' || status === 'duplicate') && s.rejection_reason && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                >
                  <span className="text-xs shrink-0" style={{ color: '#f87171' }}>{t('reviews_rejection_reason')}</span>
                  <span className="text-xs" style={{ color: 'rgba(248,113,113,0.8)' }}>{s.rejection_reason}</span>
                </div>
              )}

              {/* Photo count */}
              {s.photo_count != null && s.photo_count > 0 && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  📷 {s.photo_count} photo{s.photo_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState<FilterType>('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => getMySubmissions(1, 50).then((r) => r.data),
  })

  const submissions: any[] = data?.items ?? data?.submissions ?? []

  const filtered = useMemo(() => {
    if (filter === 'all') return submissions
    if (filter === 'rejected') return submissions.filter((s) => s.status === 'rejected' || s.status === 'duplicate')
    return submissions.filter((s) => s.status === filter)
  }, [submissions, filter])

  const approvedCount = submissions.filter((s) => s.status === 'approved').length
  const pendingCount = submissions.filter((s) => s.status === 'pending').length
  const rejectedCount = submissions.filter((s) => s.status === 'rejected' || s.status === 'duplicate').length

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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center" style={{ background: BG }}>
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-sm mb-4" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('error')}</p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(90deg, #6c63ff, #a855f7)' }}
        >
          {t('retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-28 min-h-screen" style={{ background: BG }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-15"
        style={{ background: 'radial-gradient(circle, #6c63ff 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl font-bold text-white">{t('reviews_title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(167,139,250,0.5)' }}>
          {submissions.length} {t('reviews_total').toLowerCase()}
        </p>
      </motion.div>

      {/* Stats row */}
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
          <p className="text-[10px] text-white/70 mb-1">{t('reviews_total')}</p>
          <p className="text-lg font-bold text-white leading-tight">{submissions.length}</p>
        </div>
        <div
          className="rounded-2xl p-3.5 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('reviews_approved_count')}</p>
          <p className="text-lg font-bold leading-tight" style={{ color: '#34d399' }}>{approvedCount}</p>
        </div>
        <div
          className="rounded-2xl p-3.5 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/5" />
          <p className="text-[10px] mb-1" style={{ color: 'rgba(167,139,250,0.6)' }}>{t('reviews_pending_count')}</p>
          <p className="text-lg font-bold leading-tight" style={{ color: '#fbbf24' }}>{pendingCount}</p>
        </div>
      </motion.div>

      {/* Engagement nudge: pending reviews waiting for first-time users */}
      {pendingCount > 0 && approvedCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          <span className="text-2xl">⏳</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
              {pendingCount === 1 ? 'Your review is under review!' : `${pendingCount} reviews under review!`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(251,191,36,0.6)' }}>
              Usually approved within 24 hours. A spin awaits!
            </p>
          </div>
        </motion.div>
      )}

      {/* Engagement nudge: has approved reviews — spin is ready */}
      {approvedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.06) 100%)',
            border: '1px solid rgba(52,211,153,0.2)',
          }}
        >
          <span className="text-2xl">🎡</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#34d399' }}>
              {approvedCount} review{approvedCount !== 1 ? 's' : ''} approved!
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(52,211,153,0.6)' }}>
              Go spin the wheel and claim your prize!
            </p>
          </div>
        </motion.div>
      )}

      {/* Filter pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-5 overflow-x-auto pb-1"
      >
        {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => {
          const count = f === 'all' ? submissions.length
            : f === 'pending' ? pendingCount
            : f === 'approved' ? approvedCount
            : rejectedCount
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={active
                ? { background: 'linear-gradient(90deg, #6c63ff, #a855f7)', color: 'white', boxShadow: '0 4px 12px rgba(108,99,255,0.4)' }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
              }
            >
              {f === 'all' ? t('reviews_filter_all')
                : f === 'pending' ? `${t('reviews_filter_pending')}${count > 0 ? ` (${count})` : ''}`
                : f === 'approved' ? t('reviews_filter_approved')
                : t('reviews_filter_rejected')}
            </button>
          )
        })}
      </motion.div>

      {/* List */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="text-6xl mb-4">📝</div>
          <p className="font-semibold mb-2" style={{ color: 'rgba(200,190,255,0.5)' }}>
            {t('reviews_empty')}
          </p>
          <p className="text-sm" style={{ color: 'rgba(167,139,250,0.35)' }}>
            {t('reviews_empty_sub')}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-sm underline"
              style={{ color: 'rgba(167,139,250,0.6)' }}
            >
              {t('reviews_filter_all')}
            </button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((s: any, i: number) => (
              <ReviewCard key={s.id} s={s} i={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
