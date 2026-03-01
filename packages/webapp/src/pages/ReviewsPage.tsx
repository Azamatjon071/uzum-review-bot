import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Clock, Copy } from 'lucide-react'
import { t } from '@/i18n'
import { getMySubmissions } from '@/api'
import { format } from 'date-fns'
import { useViewPreferences, type ViewMode } from '@/hooks/useViewPreferences'
import ViewToggle from '@/components/ui/ViewToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_CONFIG: Record<string, {
  badgeVariant: 'warning' | 'success' | 'error' | 'primary'
  bgClass: string
  borderClass: string
  icon: typeof Clock
  labelKey: string
}> = {
  pending: {
    badgeVariant: 'warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/20',
    icon: Clock,
    labelKey: 'reviews_status_pending',
  },
  approved: {
    badgeVariant: 'success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/20',
    icon: CheckCircle,
    labelKey: 'reviews_status_approved',
  },
  rejected: {
    badgeVariant: 'error',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/20',
    icon: XCircle,
    labelKey: 'reviews_status_rejected',
  },
  duplicate: {
    badgeVariant: 'primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/20',
    icon: Copy,
    labelKey: 'reviews_status_duplicate',
  },
}

/* ── Card View (expandable) ── */
function ReviewCard({ s, i }: { s: any; i: number }) {
  const [expanded, setExpanded] = useState(false)
  const status = s.status ?? 'pending'
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const createdDate = s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy') : '—'
  const shortId = String(s.id ?? '').slice(0, 8).toUpperCase()

  const product = s.product
  const productName = product
    ? (product.name_uz ?? product.name_ru ?? product.name_en ?? '—')
    : (s.product_url ? s.product_url : '—')

  const cardBg = status === 'approved'
    ? 'bg-success/5 border border-success/15'
    : status === 'pending'
    ? 'bg-primary/5 border border-primary/15'
    : 'bg-card border border-border'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: i * 0.04 }}
      className={`rounded-2xl overflow-hidden ${cardBg}`}
    >
      {/* Main row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${sc.bgClass}`}>
              <sc.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                {productName}
              </p>
              <p className="text-xs mt-0.5 text-primary/55">
                ID: <span className="font-mono">{shortId}</span>
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground/50">
                {t('reviews_submitted_on')} {createdDate}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge variant={sc.badgeVariant}>
              {t(sc.labelKey as any)}
            </StatusBadge>
            {s.spin_granted && (
              <StatusBadge variant="primary" size="sm">
                🎡 {t('reviews_spin_granted')}
              </StatusBadge>
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
            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/30">
              {!product && s.product_url && (
                <p className="text-xs break-all text-primary/60">
                  {s.product_url}
                </p>
              )}

              {/* Rejection reason */}
              {(status === 'rejected' || status === 'duplicate') && s.rejection_reason && (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-destructive/5 border border-destructive/15">
                  <span className="text-xs shrink-0 text-destructive">{t('reviews_rejection_reason')}</span>
                  <span className="text-xs text-destructive/80">{s.rejection_reason}</span>
                </div>
              )}

              {/* Photo count */}
              {s.photo_count != null && s.photo_count > 0 && (
                <p className="text-xs text-muted-foreground/50">
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

/* ── List View (compact row) ── */
function ReviewListItem({ s, i }: { s: any; i: number }) {
  const status = s.status ?? 'pending'
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const createdDate = s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy') : '—'

  const product = s.product
  const productName = product
    ? (product.name_uz ?? product.name_ru ?? product.name_en ?? '—')
    : (s.product_url ? s.product_url : '—')

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.03 }}
      className="flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2.5"
    >
      <sc.icon className={`w-4 h-4 shrink-0 ${sc.badgeVariant === 'warning' ? 'text-warning' : sc.badgeVariant === 'success' ? 'text-success' : sc.badgeVariant === 'error' ? 'text-destructive' : 'text-primary'}`} />
      <p className="text-sm text-foreground truncate flex-1 min-w-0">{productName}</p>
      <span className="text-xs text-muted-foreground/50 shrink-0">{createdDate}</span>
      <StatusBadge variant={sc.badgeVariant} size="sm">
        {t(sc.labelKey as any)}
      </StatusBadge>
    </motion.div>
  )
}

/* ── Kanban Card (compact) ── */
function KanbanCard({ s }: { s: any }) {
  const status = s.status ?? 'pending'
  const createdDate = s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy') : '—'

  const product = s.product
  const productName = product
    ? (product.name_uz ?? product.name_ru ?? product.name_en ?? '—')
    : (s.product_url ? s.product_url : '—')

  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <p className="text-sm font-medium text-foreground truncate">{productName}</p>
      <p className="text-xs text-muted-foreground/50 mt-1">{createdDate}</p>
      {(status === 'rejected' || status === 'duplicate') && s.rejection_reason && (
        <p className="text-xs text-destructive/70 mt-1.5 line-clamp-2">{s.rejection_reason}</p>
      )}
      {s.spin_granted && (
        <span className="inline-block mt-1.5 text-xs text-primary/70">🎡 {t('reviews_spin_granted')}</span>
      )}
    </div>
  )
}

/* ── Kanban columns config ── */
const KANBAN_COLUMNS: { status: string; labelKey: string; badgeVariant: 'warning' | 'success' | 'error' }[] = [
  { status: 'pending', labelKey: 'reviews_status_pending', badgeVariant: 'warning' },
  { status: 'approved', labelKey: 'reviews_status_approved', badgeVariant: 'success' },
  { status: 'rejected', labelKey: 'reviews_status_rejected', badgeVariant: 'error' },
]

export default function ReviewsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const view = useViewPreferences((s) => s.getView)('reviews', 'list')
  const setView = useViewPreferences((s) => s.setView)

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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-sm mb-4 text-muted-foreground">{t('error')}</p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-primary-foreground bg-gradient-to-r from-primary to-purple-500 shadow-md shadow-primary/30"
        >
          {t('retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-28 min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-15 bg-primary/30 blur-[40px]" />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reviews_title')}</h1>
          <p className="text-sm mt-0.5 text-muted-foreground/60">
            {submissions.length} {t('reviews_total').toLowerCase()}
          </p>
        </div>
        <ViewToggle
          current={view}
          onChange={(m: ViewMode) => setView('reviews', m)}
          options={['list', 'card', 'kanban']}
        />
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-2.5 mb-5"
      >
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/30">
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/10" />
          <p className="text-[10px] text-primary-foreground/70 mb-1">{t('reviews_total')}</p>
          <p className="text-lg font-bold text-primary-foreground leading-tight">{submissions.length}</p>
        </div>
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-foreground/5" />
          <p className="text-[10px] mb-1 text-muted-foreground">{t('reviews_approved_count')}</p>
          <p className="text-lg font-bold leading-tight text-success">{approvedCount}</p>
        </div>
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-foreground/5" />
          <p className="text-[10px] mb-1 text-muted-foreground">{t('reviews_pending_count')}</p>
          <p className="text-lg font-bold leading-tight text-warning">{pendingCount}</p>
        </div>
      </motion.div>

      {/* Engagement nudge: pending reviews waiting for first-time users */}
      {pendingCount > 0 && approvedCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 bg-warning/10 border border-warning/20"
        >
          <span className="text-2xl">⏳</span>
          <div>
            <p className="text-sm font-semibold text-warning">
              {pendingCount === 1 ? 'Your review is under review!' : `${pendingCount} reviews under review!`}
            </p>
            <p className="text-xs mt-0.5 text-warning/60">
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
          className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 bg-success/10 border border-success/20"
        >
          <span className="text-2xl">🎡</span>
          <div>
            <p className="text-sm font-semibold text-success">
              {approvedCount} review{approvedCount !== 1 ? 's' : ''} approved!
            </p>
            <p className="text-xs mt-0.5 text-success/60">
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
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                  : 'bg-secondary text-muted-foreground border border-border'
              }`}
            >
              {f === 'all' ? t('reviews_filter_all')
                : f === 'pending' ? `${t('reviews_filter_pending')}${count > 0 ? ` (${count})` : ''}`
                : f === 'approved' ? t('reviews_filter_approved')
                : t('reviews_filter_rejected')}
            </button>
          )
        })}
      </motion.div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('reviews_empty')}
          description={t('reviews_empty_sub')}
          action={
            filter !== 'all' ? (
              <button
                onClick={() => setFilter('all')}
                className="text-sm underline text-primary/70"
              >
                {t('reviews_filter_all')}
              </button>
            ) : undefined
          }
        />
      ) : view === 'kanban' ? (
        /* ── Kanban View ── */
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
          {KANBAN_COLUMNS.map(({ status, labelKey, badgeVariant }) => {
            const items = submissions.filter((s) =>
              status === 'rejected'
                ? (s.status === 'rejected' || s.status === 'duplicate')
                : s.status === status
            )
            return (
              <div key={status} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge variant={badgeVariant}>{t(labelKey as any)}</StatusBadge>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map((s) => (
                    <KanbanCard key={s.id} s={s} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : view === 'list' ? (
        /* ── List View ── */
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((s: any, i: number) => (
              <ReviewListItem key={s.id} s={s} i={i} />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        /* ── Card View ── */
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
