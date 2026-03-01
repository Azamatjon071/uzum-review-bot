import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUsers, banUser, unbanUser } from '@/api'
import { formatDate } from '@/lib/utils'
import { clsx } from 'clsx'
import {
  Users, MoreHorizontal, ShieldBan, ShieldCheck, Eye,
  ChevronLeft, ChevronRight, ArrowUpDown,
} from 'lucide-react'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import type { ViewMode, Density } from '@/hooks/useViewPreferences'
import PageHeader from '@/components/ui/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import ViewToggle from '@/components/ui/ViewToggle'
import DensityToggle from '@/components/ui/DensityToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'

// ── Engagement helpers ───────────────────────────────────────────────────────

function calcEngagement(user: any): number {
  return (user.total_submissions ?? 0) * 10
    + (user.approved_submissions ?? 0) * 20
    + (user.total_spins ?? 0) * 5
}

function engagementTier(score: number): { label: string; variant: 'neutral' | 'info' | 'success' | 'warning' } {
  if (score >= 300) return { label: 'VIP', variant: 'warning' }
  if (score >= 150) return { label: 'High', variant: 'success' }
  if (score >= 50) return { label: 'Medium', variant: 'info' }
  return { label: 'Low', variant: 'neutral' }
}

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'banned', label: 'Banned' },
]

type SortField = 'username' | 'first_name' | 'total_submissions' | 'approved_submissions' | 'total_spins' | 'created_at'
type SortDir = 'asc' | 'desc'

// ── Avatar helper ────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initial = (name?.[0] ?? '?').toUpperCase()
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary shrink-0`}>
      {initial}
    </div>
  )
}

// ── Action dropdown ──────────────────────────────────────────────────────────

function ActionDropdown({ user, onBan, onUnban, onView }: {
  user: any
  onBan: () => void
  onUnban: () => void
  onView: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-40 rounded-lg border border-border bg-popover shadow-lg py-1">
            <button
              onClick={(e) => { e.stopPropagation(); onView(); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            {user.is_banned ? (
              <button
                onClick={(e) => { e.stopPropagation(); onUnban(); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-muted transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Unban
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onBan(); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-muted transition-colors"
              >
                <ShieldBan className="w-3.5 h-3.5" /> Ban
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient()
  const { density, setDensity, getView, setView } = useViewPreferences()
  const dc = densityClasses[density]
  const view = getView('users', 'table') as ViewMode

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, statusFilter],
    queryFn: () =>
      getUsers({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        is_banned: statusFilter === 'all' ? undefined : statusFilter === 'banned',
      }).then((r) => r.data),
  })

  const banMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => banUser(id, reason),
    onSuccess: () => {
      toast.success('User banned')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to ban user'),
  })

  const unbanMut = useMutation({
    mutationFn: (id: string) => unbanUser(id),
    onSuccess: () => {
      toast.success('User unbanned')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to unban user'),
  })

  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  // Sort locally (API may not support sorting, so we sort in-client)
  const sorted = [...users].sort((a: any, b: any) => {
    const av = a[sortField] ?? ''
    const bv = b[sortField] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected((prev) => prev.length === users.length ? [] : users.map((u: any) => u.id))

  const handleBan = (user: any) => {
    const reason = window.prompt(`Ban ${user.first_name ?? 'user'}? Enter reason:`)
    if (reason !== null) {
      banMut.mutate({ id: user.id, reason: reason || 'Banned by admin' })
    }
  }

  const handleUnban = (user: any) => {
    if (window.confirm(`Unban ${user.first_name ?? 'user'}?`)) {
      unbanMut.mutate(user.id)
    }
  }

  const handleView = (user: any) => {
    // Could navigate to user detail — for now opens alert with info
    window.alert(`User: ${user.first_name ?? ''} ${user.last_name ?? ''}\nTelegram: ${user.telegram_id}\nSubmissions: ${user.total_submissions}\nSpins: ${user.total_spins}`)
  }

  const filterChips = STATUS_FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    active: statusFilter === f.key,
  }))

  const handleChip = (key: string) => {
    setStatusFilter(key)
    setPage(1)
  }

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  // ── Sort header helper ──
  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {children}
        <ArrowUpDown className={clsx('w-3 h-3', sortField === field && 'text-foreground')} />
      </button>
    )
  }

  return (
    <div className={dc.spacing}>
      {/* Header */}
      <PageHeader
        title="Users"
        badge={
          <StatusBadge variant="info" size="sm">{total.toLocaleString()}</StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <DensityToggle current={density} onChange={setDensity} />
            <ViewToggle
              current={view}
              onChange={(m) => { setView('users', m); setSelected([]) }}
              options={['table', 'card', 'list']}
            />
          </div>
        }
      />

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Search name or username..."
        chips={filterChips}
        onChipToggle={handleChip}
      />

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-muted-foreground" />}
          title="No users found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <>
          {/* ── Table view ── */}
          {view === 'table' && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className={`w-full ${dc.text}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className={`${dc.padding} w-8`}>
                        <input
                          type="checkbox"
                          checked={selected.length === users.length && users.length > 0}
                          onChange={toggleAll}
                          className="rounded border-border"
                        />
                      </th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                        <SortHeader field="username">Username</SortHeader>
                      </th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                        <SortHeader field="first_name">Name</SortHeader>
                      </th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                        <SortHeader field="total_submissions">Submissions</SortHeader>
                      </th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                        <SortHeader field="approved_submissions">Approved</SortHeader>
                      </th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                        <SortHeader field="total_spins">Spins</SortHeader>
                      </th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>Status</th>
                      <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                        <SortHeader field="created_at">Joined</SortHeader>
                      </th>
                      <th className={`${dc.padding} w-10`} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sorted.map((u: any) => {
                      const eng = calcEngagement(u)
                      const tier = engagementTier(eng)
                      return (
                        <tr
                          key={u.id}
                          className={clsx(
                            'hover:bg-muted/30 transition-colors',
                            selected.includes(u.id) && 'bg-primary/5'
                          )}
                        >
                          <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.includes(u.id)}
                              onChange={() => toggleSelect(u.id)}
                              className="rounded border-border"
                            />
                          </td>
                          <td className={dc.padding}>
                            <span className="text-muted-foreground">
                              {u.username ? `@${u.username}` : '—'}
                            </span>
                          </td>
                          <td className={dc.padding}>
                            <div className="flex items-center gap-2">
                              <UserAvatar name={u.first_name ?? '?'} size="sm" />
                              <span className="font-medium text-foreground truncate">
                                {u.first_name ?? ''} {u.last_name ?? ''}
                              </span>
                            </div>
                          </td>
                          <td className={`${dc.padding} text-foreground tabular-nums`}>
                            {u.total_submissions ?? 0}
                          </td>
                          <td className={`${dc.padding} text-foreground tabular-nums`}>
                            {u.approved_submissions ?? 0}
                          </td>
                          <td className={`${dc.padding} text-foreground tabular-nums`}>
                            {u.total_spins ?? 0}
                          </td>
                          <td className={dc.padding}>
                            <StatusBadge
                              variant={u.is_banned ? 'error' : 'success'}
                              dot
                              size="sm"
                            >
                              {u.is_banned ? 'Banned' : 'Active'}
                            </StatusBadge>
                          </td>
                          <td className={`${dc.padding} text-muted-foreground whitespace-nowrap`}>
                            {formatDate(u.created_at)}
                          </td>
                          <td className={dc.padding}>
                            <ActionDropdown
                              user={u}
                              onBan={() => handleBan(u)}
                              onUnban={() => handleUnban(u)}
                              onView={() => handleView(u)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Card view ── */}
          {view === 'card' && (
            <div className={`grid gap-3 ${dc.gridCols}`}>
              {sorted.map((u: any) => {
                const eng = calcEngagement(u)
                const tier = engagementTier(eng)
                return (
                  <DataCard key={u.id} padding="md">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.first_name ?? '?'} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {u.first_name ?? ''} {u.last_name ?? ''}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                          </p>
                        </div>
                      </div>
                      <ActionDropdown
                        user={u}
                        onBan={() => handleBan(u)}
                        onUnban={() => handleUnban(u)}
                        onView={() => handleView(u)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center rounded-md bg-muted/50 py-1.5">
                        <p className="text-sm font-semibold text-foreground">{u.total_submissions ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Submissions</p>
                      </div>
                      <div className="text-center rounded-md bg-muted/50 py-1.5">
                        <p className="text-sm font-semibold text-foreground">{u.approved_submissions ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Approved</p>
                      </div>
                      <div className="text-center rounded-md bg-muted/50 py-1.5">
                        <p className="text-sm font-semibold text-foreground">{u.total_spins ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Spins</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge variant={u.is_banned ? 'error' : 'success'} dot size="sm">
                          {u.is_banned ? 'Banned' : 'Active'}
                        </StatusBadge>
                        <StatusBadge variant={tier.variant} size="sm">
                          {tier.label}
                        </StatusBadge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{eng}pts</span>
                    </div>
                  </DataCard>
                )
              })}
            </div>
          )}

          {/* ── List view ── */}
          {view === 'list' && (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {sorted.map((u: any) => (
                <div
                  key={u.id}
                  className={clsx('flex items-center gap-3 hover:bg-muted/30 transition-colors', dc.padding)}
                >
                  <UserAvatar name={u.first_name ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.first_name ?? ''} {u.last_name ?? ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {u.total_submissions ?? 0} subs
                  </span>
                  <StatusBadge variant={u.is_banned ? 'error' : 'success'} dot size="sm">
                    {u.is_banned ? 'Banned' : 'Active'}
                  </StatusBadge>
                  <ActionDropdown
                    user={u}
                    onBan={() => handleBan(u)}
                    onUnban={() => handleUnban(u)}
                    onView={() => handleView(u)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {from}–{to} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
