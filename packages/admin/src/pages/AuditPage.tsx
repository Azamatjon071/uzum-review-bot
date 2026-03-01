import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { cn, formatDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, History,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import ViewToggle from '@/components/ui/ViewToggle'
import FilterBar from '@/components/ui/FilterBar'
import DataCard from '@/components/ui/DataCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

/* ── Types ──────────────────────────────────────────────────────────────────── */

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

/* ── Action → badge variant mapping ────────────────────────────────────────── */

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

const ACTION_VARIANTS: Record<string, BadgeVariant> = {
  admin_login_attempt: 'info',
  'broadcast.sent': 'primary',
  'submission.approved': 'success',
  'submission.rejected': 'error',
  'user.banned': 'warning',
  'user.unbanned': 'success',
  'prize.created': 'info',
  'prize.updated': 'info',
  'prize.deleted': 'error',
  'prize.toggled': 'info',
  'settings.updated': 'neutral',
  'admin.created': 'info',
  'admin.deleted': 'error',
}

function actionVariant(action: string): BadgeVariant {
  if (ACTION_VARIANTS[action]) return ACTION_VARIANTS[action]
  if (action.startsWith('prize')) return 'info'
  return 'neutral'
}

const DOT_COLORS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400 dark:bg-gray-500',
  primary: 'bg-violet-500',
}

/* ── Filter chip definitions ────────────────────────────────────────────────── */

const ACTION_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'admin_login_attempt', label: 'Login' },
  { key: 'submission.approved', label: 'Approved' },
  { key: 'submission.rejected', label: 'Rejected' },
  { key: 'broadcast.sent', label: 'Broadcast' },
  { key: 'user.banned', label: 'Banned' },
  { key: 'prize', label: 'Prize' },
]

const LIMIT = 30

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function getAdminName(entry: AuditEntry): string {
  return (
    entry.admin?.full_name ??
    entry.admin?.email ??
    entry.admin_name ??
    entry.admin_id ??
    'System'
  )
}

function shortId(id: string, max = 8): string {
  return id.length > max ? `${id.slice(0, max)}…` : id
}

/* ── JSON diff viewer ───────────────────────────────────────────────────────── */

function JsonDiff({ before, after }: { before?: unknown; after?: unknown }) {
  if (before == null && after == null) {
    return (
      <p className="text-xs text-muted-foreground italic">No data recorded for this action.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {before != null && (
        <div>
          <p className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Before
          </p>
          <pre className="text-xs font-mono text-foreground bg-muted/50 rounded-xl p-3 overflow-auto max-h-52 border border-border/50 leading-relaxed">
            {typeof before === 'string' ? before : JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {after != null && (
        <div>
          <p className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            After
          </p>
          <pre className="text-xs font-mono text-foreground bg-muted/50 rounded-xl p-3 overflow-auto max-h-52 border border-border/50 leading-relaxed">
            {typeof after === 'string' ? after : JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

/* ── Loading skeleton ───────────────────────────────────────────────────────── */

function AuditSkeleton() {
  return (
    <DataCard padding="none" className="overflow-hidden">
      <div className="divide-y divide-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
            <div className="w-4 h-4 rounded bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 rounded bg-muted" />
              <div className="h-3 w-44 rounded bg-muted" />
            </div>
            <div className="h-5 w-24 rounded-full bg-muted" />
            <div className="hidden sm:block h-3 w-20 rounded bg-muted" />
            <div className="hidden md:block h-3 w-24 rounded bg-muted font-mono" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </DataCard>
  )
}

/* ── Table view ─────────────────────────────────────────────────────────────── */

function TableView({
  logs,
  expandedId,
  onToggle,
  dc,
}: {
  logs: AuditEntry[]
  expandedId: string | null
  onToggle: (id: string) => void
  dc: (typeof import('@/hooks/useViewPreferences').densityClasses)[keyof typeof import('@/hooks/useViewPreferences').densityClasses]
}) {
  return (
    <DataCard padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cn('w-full min-w-[720px]', dc.text)}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                { label: '', cls: 'w-10' },
                { label: 'Admin', cls: 'min-w-[140px]' },
                { label: 'Action', cls: 'min-w-[160px]' },
                { label: 'Resource', cls: 'min-w-[120px]' },
                { label: 'IP Address', cls: 'min-w-[120px]' },
                { label: 'Date', cls: 'min-w-[100px]' },
              ].map(({ label, cls }) => (
                <th
                  key={label}
                  className={cn(
                    'text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider',
                    dc.padding,
                    cls,
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((entry) => {
              const isExpanded = expandedId === entry.id
              const hasDetail = entry.before_data != null || entry.after_data != null
              const variant = actionVariant(entry.action)

              return (
                <tr key={entry.id}>
                  {/* Single full-width td with colSpan trick for expandable rows */}
                  <td colSpan={6} className="p-0">
                    {/* Main row content */}
                    <div
                      className={cn(
                        'flex items-center transition-colors',
                        hasDetail && 'cursor-pointer hover:bg-muted/30',
                        isExpanded && 'bg-muted/20',
                      )}
                      onClick={() => hasDetail && onToggle(entry.id)}
                    >
                      {/* Expand chevron */}
                      <div className={cn(dc.padding, 'w-10 shrink-0 flex items-center justify-center')}>
                        {hasDetail ? (
                          isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                          )
                        ) : null}
                      </div>

                      {/* Admin */}
                      <div className={cn(dc.padding, 'min-w-[140px] flex-1')}>
                        <p className="text-sm font-medium text-foreground truncate max-w-[160px]">
                          {getAdminName(entry)}
                        </p>
                      </div>

                      {/* Action */}
                      <div className={cn(dc.padding, 'min-w-[160px]')}>
                        <StatusBadge variant={variant}>{entry.action}</StatusBadge>
                      </div>

                      {/* Resource */}
                      <div className={cn(dc.padding, 'min-w-[120px]')}>
                        {entry.resource_type ? (
                          <span className="text-xs text-muted-foreground">
                            {entry.resource_type}
                            {entry.resource_id && (
                              <span className="text-muted-foreground/60"> #{shortId(entry.resource_id)}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* IP */}
                      <div className={cn(dc.padding, 'min-w-[120px]')}>
                        {entry.ip_address ? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {entry.ip_address}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className={cn(dc.padding, 'min-w-[100px]')}>
                        <p
                          className="text-xs text-muted-foreground whitespace-nowrap"
                          title={formatDate(entry.created_at)}
                        >
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Expanded diff panel */}
                    {isExpanded && (
                      <div className="px-5 pt-3 pb-4 border-t border-border/50 bg-muted/10 animate-fade-in">
                        <JsonDiff before={entry.before_data} after={entry.after_data} />
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

/* ── Timeline view ──────────────────────────────────────────────────────────── */

function TimelineView({
  logs,
  expandedId,
  onToggle,
}: {
  logs: AuditEntry[]
  expandedId: string | null
  onToggle: (id: string) => void
}) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[75px] top-2 bottom-2 w-px bg-border pointer-events-none" />

      <div className="space-y-3">
        {logs.map((entry) => {
          const isExpanded = expandedId === entry.id
          const hasDetail = entry.before_data != null || entry.after_data != null
          const variant = actionVariant(entry.action)

          return (
            <div key={entry.id} className="relative flex gap-0 items-start animate-fade-in">
              {/* Timestamp column */}
              <div className="w-[60px] shrink-0 text-right pr-3 pt-2.5">
                <p
                  className="text-[10px] text-muted-foreground leading-tight"
                  title={formatDate(entry.created_at)}
                >
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Dot column — sits on the vertical line */}
              <div className="relative flex items-start justify-center w-[32px] shrink-0 pt-2.5 z-10">
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full ring-2 ring-background',
                    DOT_COLORS[variant],
                  )}
                />
              </div>

              {/* Card content */}
              <div className="flex-1 min-w-0 pl-3 pb-2">
                <DataCard
                  padding="sm"
                  className={cn(
                    'transition-all duration-200',
                    hasDetail && 'cursor-pointer',
                    isExpanded && 'border-primary/20',
                  )}
                  onClick={hasDetail ? () => onToggle(entry.id) : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {getAdminName(entry)}
                        </p>
                        <StatusBadge variant={variant}>{entry.action}</StatusBadge>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {entry.resource_type && (
                          <span className="text-xs text-muted-foreground">
                            {entry.resource_type}
                            {entry.resource_id && (
                              <span className="text-muted-foreground/60"> #{shortId(entry.resource_id)}</span>
                            )}
                          </span>
                        )}
                        {entry.ip_address && (
                          <span className="text-[10px] font-mono text-muted-foreground/70">
                            {entry.ip_address}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasDetail && (
                      <div className="shrink-0 mt-0.5">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                        )}
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                      <JsonDiff before={entry.before_data} after={entry.after_data} />
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

/* ── Pagination ─────────────────────────────────────────────────────────────── */

function Pagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  if (total <= LIMIT) return null

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to = Math.min(page * LIMIT, total)

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()}`}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page === 1}
          onClick={onPrev}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="px-3 py-1.5 rounded-xl uzum-gradient text-white text-xs font-bold tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={onNext}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */

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
    placeholderData: (prev) => prev,
  })

  const allLogs: AuditEntry[] = data?.items ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  /* Client-side filter */
  const logs = allLogs.filter((entry) => {
    if (actionFilter !== 'all') {
      if (actionFilter === 'prize') {
        if (!entry.action.startsWith('prize')) return false
      } else if (entry.action !== actionFilter) {
        return false
      }
    }
    if (search) {
      const q = search.toLowerCase()
      const name = getAdminName(entry).toLowerCase()
      return (
        name.includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        (entry.resource_type ?? '').toLowerCase().includes(q) ||
        (entry.ip_address ?? '').includes(q)
      )
    }
    return true
  })

  const toggleExpand = useCallback(
    (id: string) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  )

  function handleChipToggle(key: string) {
    setActionFilter((prev) => (key === prev ? 'all' : key))
    setPage(1)
  }

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
  }

  const chips = ACTION_CHIPS.map((c) => ({
    key: c.key,
    label: c.label,
    active: actionFilter === c.key,
  }))

  return (
    <div className={cn('space-y-5', dc.spacing)}>
      <PageHeader
        title="Audit Log"
        description="Track all admin actions and changes"
        icon={<History className="w-5 h-5 text-primary" />}
        badge={
          total > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              {total.toLocaleString()} events
            </span>
          ) : undefined
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Search admin, action, resource, IP..."
        chips={chips}
        onChipToggle={handleChipToggle}
      >
        <ViewToggle
          current={view}
          onChange={(m) => setView('audit', m)}
          options={['table', 'list']}
        />
      </FilterBar>

      {isLoading ? (
        <AuditSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<History className="w-6 h-6 text-muted-foreground/60" />}
          title="No audit entries"
          description={
            search || actionFilter !== 'all'
              ? 'No entries match your current filters. Try broadening your search.'
              : 'Admin actions will be recorded and appear here.'
          }
        />
      ) : view === 'table' ? (
        <TableView logs={logs} expandedId={expandedId} onToggle={toggleExpand} dc={dc} />
      ) : (
        <TimelineView logs={logs} expandedId={expandedId} onToggle={toggleExpand} />
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  )
}
