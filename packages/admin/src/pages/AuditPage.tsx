import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { formatDate } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Shield, History,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import ViewToggle from '@/components/ui/ViewToggle'
import FilterBar from '@/components/ui/FilterBar'
import DataCard from '@/components/ui/DataCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

/* ── Types ──────────────────────────────────────────────── */

interface AuditEntry {
  id: string
  admin?: { email: string; full_name?: string }
  admin_name?: string
  admin_id?: string
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  ip_address?: string
  before_data?: unknown
  after_data?: unknown
  created_at: string
}

/* ── Action color mapping ───────────────────────────────── */

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

const ACTION_VARIANTS: Record<string, BadgeVariant> = {
  'admin_login_attempt': 'info',
  'broadcast.sent': 'primary',
  'submission.approved': 'success',
  'submission.rejected': 'error',
  'user.banned': 'warning',
  'user.unbanned': 'success',
  'prize.created': 'info',
  'prize.updated': 'info',
  'prize.deleted': 'error',
  'settings.updated': 'neutral',
  'admin.created': 'info',
  'admin.deleted': 'error',
}

function actionVariant(action: string): BadgeVariant {
  return ACTION_VARIANTS[action] ?? 'neutral'
}

const ACTION_DOT_COLORS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400',
  primary: 'bg-violet-500',
}

/* ── Known action filter chips ──────────────────────────── */

const ACTION_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'admin_login_attempt', label: 'Login' },
  { key: 'submission.approved', label: 'Approved' },
  { key: 'submission.rejected', label: 'Rejected' },
  { key: 'broadcast.sent', label: 'Broadcast' },
  { key: 'user.banned', label: 'Banned' },
  { key: 'prize', label: 'Prize' },
]

/* ── JSON diff viewer ───────────────────────────────────── */

function JsonDiff({ before, after }: { before?: unknown; after?: unknown }) {
  if (!before && !after) {
    return <p className="text-xs text-muted-foreground italic">No data recorded</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {before != null && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Before</p>
          <pre className="text-xs font-mono text-foreground bg-muted/50 rounded-lg p-3 overflow-auto max-h-48 border border-border/50">
            {typeof before === 'string' ? before : JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {after != null && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">After</p>
          <pre className="text-xs font-mono text-foreground bg-muted/50 rounded-lg p-3 overflow-auto max-h-48 border border-border/50">
            {typeof after === 'string' ? after : JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

/* ── Constants ──────────────────────────────────────────── */

const LIMIT = 30

/* ── Main Page ──────────────────────────────────────────── */

export default function AuditPage() {
  const { getView, setView, density } = useViewPreferences()
  const view = getView('audit', 'table')
  const dc = densityClasses[density]

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => getAuditLogs({ page, limit: LIMIT }).then((r) => r.data),
  })

  const allLogs: AuditEntry[] = data?.items ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  /* ── Client-side filtering ────────────────────────────── */

  const logs = allLogs.filter((l) => {
    if (actionFilter !== 'all') {
      if (actionFilter === 'prize') {
        if (!l.action.startsWith('prize')) return false
      } else if (l.action !== actionFilter) {
        return false
      }
    }
    if (search) {
      const q = search.toLowerCase()
      const adminName = l.admin?.full_name ?? l.admin?.email ?? l.admin_name ?? ''
      if (
        !adminName.toLowerCase().includes(q) &&
        !l.action.toLowerCase().includes(q) &&
        !(l.resource_type ?? '').toLowerCase().includes(q) &&
        !(l.ip_address ?? '').includes(q)
      ) {
        return false
      }
    }
    return true
  })

  const toggleExpand = useCallback(
    (id: string) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  )

  function adminName(entry: AuditEntry): string {
    return entry.admin?.full_name ?? entry.admin?.email ?? entry.admin_name ?? entry.admin_id ?? 'System'
  }

  function chips() {
    return ACTION_CHIPS.map((c) => ({
      key: c.key,
      label: c.label,
      active: actionFilter === c.key,
    }))
  }

  function handleChipToggle(key: string) {
    setActionFilter(key === actionFilter ? 'all' : key)
  }

  /* ── Table view ───────────────────────────────────────── */

  function renderTable() {
    return (
      <DataCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={clsx('w-full min-w-[700px]', dc.text)}>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['', 'Admin', 'Action', 'Resource', 'IP Address', 'Date'].map((h) => (
                  <th
                    key={h}
                    className={clsx(
                      'text-left font-medium text-muted-foreground',
                      dc.padding,
                      h === '' && 'w-8',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => {
                const isExpanded = expandedId === l.id
                const hasDetail = l.before_data != null || l.after_data != null
                return (
                  <tr key={l.id} className="group">
                    <td className={dc.padding} colSpan={6} style={{ padding: 0 }}>
                      <div
                        className={clsx(
                          'hover:bg-muted/30 transition-colors',
                          hasDetail && 'cursor-pointer',
                        )}
                        onClick={() => hasDetail && toggleExpand(l.id)}
                      >
                        <div className="flex items-center">
                          <div className={clsx(dc.padding, 'w-8 shrink-0')}>
                            {hasDetail && (
                              isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className={clsx(dc.padding, 'flex-1 font-medium text-foreground')}>
                            {adminName(l)}
                          </div>
                          <div className={dc.padding}>
                            <StatusBadge variant={actionVariant(l.action)}>
                              {l.action}
                            </StatusBadge>
                          </div>
                          <div className={clsx(dc.padding, 'text-muted-foreground text-xs')}>
                            {l.resource_type ?? '-'}
                            {l.resource_id ? ` #${l.resource_id.length > 8 ? l.resource_id.slice(0, 8) + '...' : l.resource_id}` : ''}
                          </div>
                          <div className={clsx(dc.padding, 'text-muted-foreground text-xs font-mono')}>
                            {l.ip_address ?? '-'}
                          </div>
                          <div className={clsx(dc.padding, 'text-muted-foreground text-xs whitespace-nowrap')}>
                            {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-muted/20 animate-fade-in">
                          <JsonDiff before={l.before_data} after={l.after_data} />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DataCard>
    )
  }

  /* ── Timeline (list) view ─────────────────────────────── */

  function renderTimeline() {
    return (
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[79px] top-0 bottom-0 w-px bg-border" />

        <div className={clsx('space-y-1', dc.spacing)}>
          {logs.map((l) => {
            const isExpanded = expandedId === l.id
            const hasDetail = l.before_data != null || l.after_data != null
            const variant = actionVariant(l.action)

            return (
              <div key={l.id} className="relative flex gap-4">
                {/* Timestamp */}
                <div className="w-[64px] shrink-0 text-right pt-1">
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Dot */}
                <div className="relative flex items-start justify-center w-[30px] shrink-0 pt-1.5">
                  <div
                    className={clsx(
                      'w-2.5 h-2.5 rounded-full ring-2 ring-background z-10',
                      ACTION_DOT_COLORS[variant],
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <DataCard
                    padding="sm"
                    className={clsx(hasDetail && 'cursor-pointer')}
                    onClick={hasDetail ? () => toggleExpand(l.id) : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{adminName(l)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge variant={variant}>{l.action}</StatusBadge>
                          {l.resource_type && (
                            <span className="text-xs text-muted-foreground">
                              {l.resource_type}
                              {l.resource_id ? ` #${l.resource_id.slice(0, 8)}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {hasDetail && (
                        isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {l.ip_address && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                        IP: {l.ip_address}
                      </p>
                    )}

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                        <JsonDiff before={l.before_data} after={l.after_data} />
                      </div>
                    )}
                  </DataCard>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── Loading skeleton ─────────────────────────────────── */

  function renderSkeleton() {
    return (
      <DataCard padding="none" className="overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded bg-muted" />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
              <div className="h-5 w-24 rounded-full bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </DataCard>
    )
  }

  /* ── Pagination ───────────────────────────────────────── */

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to = Math.min(page * LIMIT, total)

  function renderPagination() {
    if (total <= LIMIT) return null
    return (
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total === 0 ? 'No results' : `${from}-${to} of ${total}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-xs font-medium text-foreground bg-primary/10 rounded-lg">
            {page}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-5', dc.spacing)}>
      <PageHeader
        title="Audit Log"
        description="Track admin actions"
        badge={
          total > 0 ? (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {total.toLocaleString()} events
            </span>
          ) : undefined
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search admin, action, resource..."
        chips={chips()}
        onChipToggle={handleChipToggle}
      >
        <ViewToggle
          current={view}
          onChange={(m) => setView('audit', m)}
          options={['table', 'list']}
        />
      </FilterBar>

      {isLoading ? (
        renderSkeleton()
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<History className="w-6 h-6 text-muted-foreground" />}
          title="No audit logs"
          description={search || actionFilter !== 'all' ? 'No entries match your filters.' : 'Actions will be recorded here.'}
        />
      ) : view === 'table' ? (
        renderTable()
      ) : (
        renderTimeline()
      )}

      {renderPagination()}
    </div>
  )
}
