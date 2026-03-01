import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert, ShieldCheck, ShieldBan, AlertTriangle, Eye,
  CheckCircle, RefreshCw, User, Clock, Filter, ExternalLink,
} from 'lucide-react'
import { api, banUser } from '@/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── API ──────────────────────────────────────────────────────────────────────

const getFraudSignals = (params: Record<string, unknown>) =>
  api.get('/admin/fraud/signals', { params }).then((r) => r.data)
const getFraudStats = () => api.get('/admin/fraud/stats').then((r) => r.data)
const dismissSignal = (id: string, reason: string) =>
  api.post(`/admin/fraud/signals/${id}/dismiss`, { reason })

// ── Types ────────────────────────────────────────────────────────────────────

type FraudSignal = {
  id: string
  user_id: string
  user_name: string
  signal_type: string
  score: number
  evidence: Record<string, unknown>
  detected_at: string
  is_false_positive: boolean
  reviewed_by: string | null
}

type FraudStats = {
  pending_review: number
  auto_banned: number
  false_positives: number
  avg_score: number
}

// ── Signal type config ────────────────────────────────────────────────────────

const SIGNAL_META: Record<string, { label: string; color: string; bg: string }> = {
  duplicate_order: { label: 'Duplicate Order', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  image_similarity: { label: 'Similar Image', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  velocity_limit: { label: 'Velocity Limit', color: 'text-red-400', bg: 'bg-red-500/10' },
  bot_behavior: { label: 'Bot Behavior', color: 'text-red-400', bg: 'bg-red-500/10' },
  new_account: { label: 'New Account', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  cluster_match: { label: 'Cluster Match', color: 'text-purple-400', bg: 'bg-purple-500/10' },
}

function signalMeta(type: string) {
  return SIGNAL_META[type] ?? { label: type, color: 'text-muted-foreground', bg: 'bg-muted' }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-destructive font-bold'
  if (score >= 50) return 'text-warning font-semibold'
  return 'text-muted-foreground'
}

function scoreBadge(score: number): string {
  if (score >= 80) return 'bg-destructive/15 text-destructive border border-destructive/30'
  if (score >= 50) return 'bg-warning/15 text-warning border border-warning/30'
  return 'bg-muted text-muted-foreground'
}

// ── Dismiss modal ─────────────────────────────────────────────────────────────

function DismissModal({
  signal,
  onClose,
}: {
  signal: FraudSignal
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => dismissSignal(signal.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fraud-signals'] })
      qc.invalidateQueries({ queryKey: ['fraud-stats'] })
      onClose()
    },
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
              <ShieldCheck size={18} className="text-success" />
            </div>
            <div>
              <p className="font-semibold text-sm">Dismiss as False Positive</p>
              <p className="text-xs text-muted-foreground">
                Signal #{signal.id.slice(0, 8)} · {signalMeta(signal.signal_type).label}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this a false positive?"
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-success text-white hover:bg-success/90 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? 'Dismissing…' : 'Dismiss Signal'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Ban confirm modal ─────────────────────────────────────────────────────────

function BanUserModal({
  userId,
  userName,
  onClose,
}: {
  userId: string
  userName: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => banUser(userId, reason || 'Banned from fraud signal'),
    onSuccess: () => {
      toast.success(`User ${userName} banned`)
      qc.invalidateQueries({ queryKey: ['fraud-signals'] })
      qc.invalidateQueries({ queryKey: ['fraud-stats'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: () => toast.error('Failed to ban user'),
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ShieldBan size={18} className="text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-sm">Ban User</p>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will prevent the user from accessing the platform. You can unban them later from Users page.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Fraudulent activity"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? 'Banning…' : 'Ban User'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FILTERS = ['all', 'pending', 'auto_banned', 'false_positive'] as const
type SignalFilter = typeof FILTERS[number]

export default function FraudPage() {
  const [filter, setFilter] = useState<SignalFilter>('pending')
  const [dismissTarget, setDismissTarget] = useState<FraudSignal | null>(null)
  const [banTarget, setBanTarget] = useState<FraudSignal | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: statsData } = useQuery({
    queryKey: ['fraud-stats'],
    queryFn: getFraudStats,
    staleTime: 30_000,
  })

  const stats: FraudStats = statsData ?? {
    pending_review: 0,
    auto_banned: 0,
    false_positives: 0,
    avg_score: 0,
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['fraud-signals', filter],
    queryFn: () => getFraudSignals({ status: filter }),
    staleTime: 30_000,
  })

  const signals: FraudSignal[] = data?.signals ?? []

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fraud Signals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Anti-fraud detection results requiring review or already resolved
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Pending Review',
            value: stats.pending_review,
            icon: AlertTriangle,
            color: 'bg-warning',
            badge: stats.pending_review > 0 ? 'bg-warning/10 text-warning' : undefined,
          },
          {
            label: 'Auto-Banned',
            value: stats.auto_banned,
            icon: ShieldAlert,
            color: 'bg-destructive',
          },
          {
            label: 'False Positives',
            value: stats.false_positives,
            icon: CheckCircle,
            color: 'bg-success',
          },
          {
            label: 'Avg. Fraud Score',
            value: stats.avg_score ? `${stats.avg_score.toFixed(0)}` : '0',
            icon: Eye,
            color: 'bg-info',
          },
        ].map((s) => (
          <div key={s.label} className="card-elevated p-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.color)}>
              <s.icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
              filter === f
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* ── Signals table ── */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">User</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Signal</th>
              <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Score</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Detected</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${50 + j * 10}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : signals.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldCheck size={28} className="opacity-30" />
                    <p className="text-sm font-medium">No signals found</p>
                    <p className="text-xs">All clear for this filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              signals.map((sig) => {
                const meta = signalMeta(sig.signal_type)
                const isExpanded = expandedId === sig.id
                return (
                  <>
                    <tr
                      key={sig.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : sig.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User size={13} className="text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-xs leading-tight">{sig.user_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{sig.user_id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium', meta.bg, meta.color)}>
                          <ShieldAlert size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-mono', scoreBadge(sig.score))}>
                          {sig.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} />
                          {new Date(sig.detected_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {sig.is_false_positive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-success bg-success/10 px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Dismissed
                          </span>
                        ) : sig.score >= 80 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            <ShieldAlert size={10} /> Auto-banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                            <Filter size={10} /> Review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {!sig.is_false_positive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDismissTarget(sig)
                              }}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-colors whitespace-nowrap"
                            >
                              Dismiss
                            </button>
                          )}
                          {!sig.is_false_positive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setBanTarget(sig)
                              }}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap flex items-center gap-1"
                            >
                              <ShieldBan size={11} /> Ban
                            </button>
                          )}
                          <a
                            href={`/users?search=${encodeURIComponent(sig.user_name)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="View user"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded evidence row */}
                    {isExpanded && (
                      <tr className="bg-muted/20 border-b border-border/50">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-start gap-2">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mt-0.5">
                              Evidence:
                            </p>
                            <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all">
                              {JSON.stringify(sig.evidence, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dismiss modal */}
      {dismissTarget && (
        <DismissModal signal={dismissTarget} onClose={() => setDismissTarget(null)} />
      )}

      {/* Ban user modal */}
      {banTarget && (
        <BanUserModal
          userId={banTarget.user_id}
          userName={banTarget.user_name}
          onClose={() => setBanTarget(null)}
        />
      )}
    </div>
  )
}
