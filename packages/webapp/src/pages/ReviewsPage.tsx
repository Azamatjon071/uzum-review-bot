import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Clock, Copy, ChevronRight, LayoutGrid } from 'lucide-react'
import { t } from '@/i18n'
import { getMySubmissions } from '@/api'
import { format } from 'date-fns'
import { useViewPreferences, type ViewMode } from '@/hooks/useViewPreferences'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import ViewToggle from '@/components/ui/ViewToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageTransition } from '@/components/ui/PageTransition'

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_CONFIG: Record<string, {
  badgeVariant: 'warning' | 'success' | 'error' | 'primary'
  borderColor: string
  iconColor: string
  bgColor: string
  icon: typeof Clock
  labelKey: string
}> = {
  pending: {
    badgeVariant: 'warning',
    borderColor: '#f59e0b',
    iconColor: 'text-warning',
    bgColor: 'bg-warning/10',
    icon: Clock,
    labelKey: 'reviews_status_pending',
  },
  approved: {
    badgeVariant: 'success',
    borderColor: '#10b981',
    iconColor: 'text-success',
    bgColor: 'bg-success/10',
    icon: CheckCircle,
    labelKey: 'reviews_status_approved',
  },
  rejected: {
    badgeVariant: 'error',
    borderColor: '#ef4444',
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
    icon: XCircle,
    labelKey: 'reviews_status_rejected',
  },
  duplicate: {
    badgeVariant: 'primary',
    borderColor: '#7000FF',
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl overflow-hidden bg-card border border-border"
      style={{ borderLeft: `4px solid ${sc.borderColor}` }}
    >
      {/* Main row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Status icon circle */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sc.bgColor}`}>
              <sc.icon className={`w-5 h-5 ${sc.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-[180px] leading-snug">
                {productName}
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground/40 font-mono">
                #{shortId}
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground/40">
                {t('reviews_submitted_on')} {createdDate}
              </p>
            </div>
          </div>

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
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-destructive block">{t('reviews_rejection_reason')}</span>
                    <span className="text-xs text-destructive/70 mt-0.5 block">{s.rejection_reason}</span>
                  </div>
                </div>
              )}

              {/* Photo thumbnails */}
              {s.image_urls && s.image_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-1">
                  {s.image_urls.map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-border/40 shrink-0"
                      style={{ width: 72, height: 72 }}
                    >
                      <img
                        src={url}
                        alt={`Review photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Photo count fallback if no URLs */}
              {(!s.image_urls || s.image_urls.length === 0) && (s.image_count ?? s.photo_count ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground/50">
                  📷 {s.image_count ?? s.photo_count} photo{(s.image_count ?? s.photo_count) !== 1 ? 's' : ''}
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
      style={{ borderLeft: `3px solid ${sc.borderColor}` }}
    >
      <sc.icon className={`w-4 h-4 shrink-0 ${sc.iconColor}`} />
      <p className="text-sm text-foreground truncate flex-1 min-w-0 font-medium">{productName}</p>
      <span className="text-xs text-muted-foreground/40 shrink-0">{createdDate}</span>
      <StatusBadge variant={sc.badgeVariant} size="sm">
        {t(sc.labelKey as any)}
      </StatusBadge>
    </motion.div>
  )
}

/* ── Kanban Card (compact) ── */
function KanbanCard({ s }: { s: any }) {
  const status = s.status ?? 'pending'
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const createdDate = s.created_at ? format(new Date(s.created_at), 'dd.MM.yyyy') : '—'

  const product = s.product
  const productName = product
    ? (product.name_uz ?? product.name_ru ?? product.name_en ?? '—')
    : (s.product_url ? s.product_url : '—')

  return (
    <div
      className="rounded-xl bg-card border border-border p-3"
      style={{ borderLeft: `3px solid ${sc.borderColor}` }}
    >
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
  
  const { impactOccurred } = useHapticFeedback()

  const submissions: any[] = data?.items ?? data?.submissions ?? []

  const filtered = useMemo(() => {
    if (filter === 'all') return submissions
    if (filter === 'rejected') return submissions.filter((s: any) => s.status === 'rejected' || s.status === 'duplicate')
    return submissions.filter((s: any) => s.status === filter)
  }, [submissions, filter])

  const approvedCount = submissions.filter((s: any) => s.status === 'approved').length
  const pendingCount = submissions.filter((s: any) => s.status === 'pending').length
  const rejectedCount = submissions.filter((s: any) => s.status === 'rejected' || s.status === 'duplicate').length

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-28 min-h-screen bg-background">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
             <Skeleton className="w-10 h-10 rounded-xl" />
             <div className="space-y-2">
                 <Skeleton className="w-32 h-5" />
                 <Skeleton className="w-20 h-3" />
             </div>
          </div>
          <Skeleton className="w-24 h-8 rounded-full" />
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
           <Skeleton className="h-24 rounded-2xl" />
           <Skeleton className="h-24 rounded-2xl" />
           <Skeleton className="h-24 rounded-2xl" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl w-full" />
          ))}
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
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-primary/25"
          style={{ background: 'linear-gradient(135deg, #7000FF, #e8007c)' }}
        >
          {t('retry')}
        </button>
      </div>
    )
  }

  const FILTER_TABS: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: t('reviews_filter_all'), count: submissions.length },
    { key: 'pending', label: t('reviews_filter_pending'), count: pendingCount },
    { key: 'approved', label: t('reviews_filter_approved'), count: approvedCount },
    { key: 'rejected', label: t('reviews_filter_rejected'), count: rejectedCount },
  ]

  return (
    <PageTransition className="px-4 pt-4 pb-28 min-h-screen bg-background">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-10 bg-primary/30 blur-[40px]" />

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
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">{t('reviews_title')}</h1>
            <p className="text-xs text-muted-foreground/50 leading-tight">
              {submissions.length} {t('reviews_total').toLowerCase()}
            </p>
          </div>
        </div>
        <ViewToggle
          current={view}
          onChange={(m: ViewMode) => setView('reviews', m)}
          options={['list', 'card', 'kanban']}
        />
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-2.5 mb-5"
      >
        {/* Total — gradient */}
        <div
          className="rounded-2xl p-3.5 relative overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7000FF, #e8007c)', boxShadow: '0 4px 20px rgba(112,0,255,0.25)' }}
        >
          <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-white/10" />
          <LayoutGrid className="w-4 h-4 text-white/60 mb-1.5" />
          <p className="text-[10px] text-white/60 mb-0.5 font-medium">{t('reviews_total')}</p>
          <p className="text-lg font-bold text-white leading-tight">{submissions.length}</p>
        </div>

        {/* Approved */}
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-success/10" />
          <CheckCircle className="w-4 h-4 text-success/60 mb-1.5" />
          <p className="text-[10px] mb-0.5 font-medium text-muted-foreground/50">{t('reviews_approved_count')}</p>
          <p className="text-lg font-bold text-success leading-tight">{approvedCount}</p>
        </div>

        {/* Pending */}
        <div className="rounded-2xl p-3.5 relative overflow-hidden bg-card border border-border">
          <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-warning/10" />
          <Clock className="w-4 h-4 text-warning/60 mb-1.5" />
          <p className="text-[10px] mb-0.5 font-medium text-muted-foreground/50">{t('reviews_pending_count')}</p>
          <p className="text-lg font-bold text-warning leading-tight">{pendingCount}</p>
        </div>
      </motion.div>

      {/* ── Engagement nudges ── */}
      {pendingCount > 0 && approvedCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 bg-warning/8 border border-warning/20"
        >
          <span className="text-2xl shrink-0">⏳</span>
          <div>
            <p className="text-sm font-semibold text-warning">
              {pendingCount === 1 ? 'Your review is under review!' : `${pendingCount} reviews under review!`}
            </p>
            <p className="text-xs mt-0.5 text-warning/55">
              Usually approved within 24 hours. A spin awaits!
            </p>
          </div>
        </motion.div>
      )}

      {approvedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 bg-success/8 border border-success/20"
        >
          <span className="text-2xl shrink-0">🎡</span>
          <div>
            <p className="text-sm font-semibold text-success">
              {approvedCount} review{approvedCount !== 1 ? 's' : ''} approved!
            </p>
            <p className="text-xs mt-0.5 text-success/55">
              Go spin the wheel and claim your prize!
            </p>
          </div>
        </motion.div>
      )}

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
            onClick={() => {
              setFilter(key)
              impactOccurred('light')
            }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === key
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                : 'bg-secondary text-muted-foreground border border-border'
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  filter === key ? 'bg-primary/25 text-primary' : 'bg-border text-muted-foreground/50'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Content ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('reviews_empty')}
          description={t('reviews_empty_sub')}
          action={
            filter !== 'all' ? (
              <button
                onClick={() => setFilter('all')}
                className="text-sm flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
              >
                {t('reviews_filter_all')} <ChevronRight className="w-3.5 h-3.5" />
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
            const sc = STATUS_CONFIG[status]
            return (
              <div key={status} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: sc?.borderColor }}
                  />
                  <StatusBadge variant={badgeVariant}>{t(labelKey as any)}</StatusBadge>
                  <span className="text-xs text-muted-foreground/50 ml-1">({items.length})</span>
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
    </PageTransition>
  )
}
