import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import {
  getSubmissions, approveSubmission, rejectSubmission, bulkApprove, bulkReject,
} from '@/api'
import { formatDate } from '@/lib/utils'
import {
  CheckCircle2, XCircle, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Eye, ZoomIn, ArrowUpDown,
} from 'lucide-react'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import type { ViewMode } from '@/hooks/useViewPreferences'
import PageHeader from '@/components/ui/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import ViewToggle from '@/components/ui/ViewToggle'
import DensityToggle from '@/components/ui/DensityToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'
import KanbanBoard from '@/components/ui/KanbanBoard'

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
]

const statusVariantMap: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  DUPLICATE: 'neutral',
}

// ── Helper: normalize images ─────────────────────────────────────────────────

function toImageUrls(images: any[]): string[] {
  return (images ?? []).map((img) => (typeof img === 'string' ? img : img?.url ?? '')).filter(Boolean)
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const [cur, setCur] = useState(index)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCur((c) => Math.max(0, c - 1))
      if (e.key === 'ArrowRight') setCur((c) => Math.min(images.length - 1, c + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      {cur > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCur((c) => c - 1) }}
          className="absolute left-4 p-3 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <img
        src={images[cur]}
        alt={`Image ${cur + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {cur < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCur((c) => c + 1) }}
          className="absolute right-4 p-3 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCur(i) }}
              className={clsx('w-2 h-2 rounded-full transition-colors', i === cur ? 'bg-white' : 'bg-white/40')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ sub, onClose, onApprove, onReject }: {
  sub: any
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const images = toImageUrls(sub.images)

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Submission Detail</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <StatusBadge variant={statusVariantMap[sub.status] ?? 'neutral'} dot>
            {sub.status}
          </StatusBadge>

          {/* User */}
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">User</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {(sub.user?.first_name ?? '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {sub.user?.first_name ?? '—'} {sub.user?.last_name ?? ''}
                </p>
                {sub.user?.username && (
                  <p className="text-xs text-muted-foreground">@{sub.user.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Product */}
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Product</p>
            <p className="text-sm text-foreground">
              {sub.product?.name_en ?? sub.product?.name_uz ?? sub.product?.name_ru ?? '—'}
            </p>
          </div>

          {/* Date */}
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Submitted</p>
            <p className="text-sm text-foreground">{formatDate(sub.created_at)}</p>
          </div>

          {/* Rejection reason */}
          {sub.rejection_reason && (
            <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
              <p className="text-sm text-red-800 dark:text-red-300">{sub.rejection_reason}</p>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Screenshots ({images.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="relative aspect-video rounded-lg bg-muted overflow-hidden border border-border hover:border-primary/50 transition-colors group"
                  >
                    <img src={img} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {sub.status === 'PENDING' && (
          <div className="px-5 py-4 border-t border-border space-y-2">
            {showReject ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (optional)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onReject(sub.id, rejectReason || undefined); onClose() }}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setRejectReason('') }}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { onApprove(sub.id); onClose() }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const qc = useQueryClient()
  const { density, setDensity, getView, setView } = useViewPreferences()
  const dc = densityClasses[density]
  const view = getView('submissions', 'table') as ViewMode

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [drawerSub, setDrawerSub] = useState<any>(null)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const [sortField, setSortField] = useState<'created_at' | 'status'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // For kanban we fetch all statuses; for table/card we use status filter
  const isKanban = view === 'kanban'

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', page, isKanban ? '' : status, search],
    queryFn: () =>
      getSubmissions({
        page,
        page_size: isKanban ? 100 : PAGE_SIZE,
        status: isKanban ? undefined : (status || undefined),
        search: search || undefined,
      }).then((r) => r.data),
  })

  const approveMut = useMutation({
    mutationFn: approveSubmission,
    onSuccess: () => {
      toast.success('Approved')
      qc.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to approve'),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectSubmission(id, reason),
    onSuccess: () => {
      toast.success('Rejected')
      qc.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to reject'),
  })

  const bulkApproveMut = useMutation({
    mutationFn: () => bulkApprove(selected),
    onSuccess: () => {
      toast.success(`Approved ${selected.length} submissions`)
      setSelected([])
      qc.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: () => toast.error('Bulk approve failed'),
  })

  const bulkRejectMut = useMutation({
    mutationFn: () => bulkReject(selected),
    onSuccess: () => {
      toast.success(`Rejected ${selected.length} submissions`)
      setSelected([])
      qc.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: () => toast.error('Bulk reject failed'),
  })

  const submissions = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const pendingCount = submissions.filter((s: any) => s.status === 'PENDING').length

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected((prev) => prev.length === submissions.length ? [] : submissions.map((s: any) => s.id))

  const toggleSort = (field: 'created_at' | 'status') => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...submissions].sort((a: any, b: any) => {
    const av = a[sortField] ?? ''
    const bv = b[sortField] ?? ''
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })

  const filterChips = STATUS_FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    active: status === f.key,
  }))

  const handleChip = (key: string) => {
    setStatus(key)
    setPage(1)
  }

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  const handleApprove = (id: string) => approveMut.mutate(id)
  const handleReject = (id: string, reason?: string) => rejectMut.mutate({ id, reason })

  // ── Kanban columns ──
  const kanbanColumns = [
    {
      id: 'PENDING',
      title: 'Pending',
      color: 'bg-amber-500',
      items: submissions.filter((s: any) => s.status === 'PENDING'),
    },
    {
      id: 'APPROVED',
      title: 'Approved',
      color: 'bg-emerald-500',
      items: submissions.filter((s: any) => s.status === 'APPROVED'),
    },
    {
      id: 'REJECTED',
      title: 'Rejected',
      color: 'bg-red-500',
      items: submissions.filter((s: any) => s.status === 'REJECTED'),
    },
  ]

  const handleKanbanMove = (itemId: string, fromCol: string, toCol: string) => {
    if (fromCol === toCol) return
    if (toCol === 'APPROVED') {
      approveMut.mutate(itemId)
    } else if (toCol === 'REJECTED') {
      const reason = window.prompt('Rejection reason (optional):')
      rejectMut.mutate({ id: itemId, reason: reason || undefined })
    }
  }

  function SortHeader({ field, children }: { field: 'created_at' | 'status'; children: React.ReactNode }) {
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
    <>
      {lightbox && <Lightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
      {drawerSub && (
        <DetailDrawer
          sub={drawerSub}
          onClose={() => setDrawerSub(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <div className={dc.spacing}>
        {/* Header */}
        <PageHeader
          title="Submissions"
          badge={
            pendingCount > 0 ? (
              <StatusBadge variant="warning" size="sm">{pendingCount} pending</StatusBadge>
            ) : undefined
          }
          actions={
            <div className="flex items-center gap-2">
              <DensityToggle current={density} onChange={setDensity} />
              <ViewToggle
                current={view}
                onChange={(m) => { setView('submissions', m); setSelected([]) }}
                options={['table', 'card', 'kanban']}
              />
            </div>
          }
        />

        {/* Filters */}
        {!isKanban && (
          <FilterBar
            searchValue={search}
            onSearchChange={handleSearch}
            searchPlaceholder="Search submissions..."
            chips={filterChips}
            onChipToggle={handleChip}
          />
        )}

        {/* Bulk actions bar */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
            <span className="text-sm font-medium text-foreground">
              {selected.length} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => bulkApproveMut.mutate()}
                disabled={bulkApproveMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
              </button>
              <button
                onClick={() => bulkRejectMut.mutate()}
                disabled={bulkRejectMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject All
              </button>
              <button
                onClick={() => setSelected([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="No submissions found"
            description="Try adjusting your filters or check back later"
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
                            checked={selected.length === submissions.length && submissions.length > 0}
                            onChange={toggleAll}
                            className="rounded border-border"
                          />
                        </th>
                        <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>User</th>
                        <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>Product</th>
                        <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                          <SortHeader field="status">Status</SortHeader>
                        </th>
                        <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>
                          <SortHeader field="created_at">Date</SortHeader>
                        </th>
                        <th className={`${dc.padding} text-left font-medium text-muted-foreground`}>Images</th>
                        <th className={`${dc.padding} w-24`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sorted.map((s: any) => {
                        const images = toImageUrls(s.images)
                        return (
                          <tr
                            key={s.id}
                            className={clsx(
                              'hover:bg-muted/30 transition-colors cursor-pointer',
                              selected.includes(s.id) && 'bg-primary/5'
                            )}
                            onClick={() => setDrawerSub(s)}
                          >
                            <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected.includes(s.id)}
                                onChange={() => toggle(s.id)}
                                className="rounded border-border"
                              />
                            </td>
                            <td className={dc.padding}>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                  {(s.user?.first_name ?? '?')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {s.user?.first_name ?? '—'}
                                  </p>
                                  {s.user?.username && (
                                    <p className="text-xs text-muted-foreground">@{s.user.username}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className={`${dc.padding} text-muted-foreground truncate max-w-[180px]`}>
                              {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                            </td>
                            <td className={dc.padding}>
                              <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                                {s.status}
                              </StatusBadge>
                            </td>
                            <td className={`${dc.padding} text-muted-foreground whitespace-nowrap`}>
                              {formatDate(s.created_at)}
                            </td>
                            <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              {images.length > 0 ? (
                                <button
                                  onClick={() => setLightbox({ images, index: 0 })}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                                >
                                  <ImageIcon className="w-3 h-3" /> {images.length}
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              {s.status === 'PENDING' ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleApprove(s.id)}
                                    disabled={approveMut.isPending}
                                    className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt('Rejection reason (optional):')
                                      if (reason !== null) handleReject(s.id, reason || undefined)
                                    }}
                                    disabled={rejectMut.isPending}
                                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDrawerSub(s)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDrawerSub(s)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
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
                {sorted.map((s: any) => {
                  const images = toImageUrls(s.images)
                  return (
                    <DataCard
                      key={s.id}
                      onClick={() => setDrawerSub(s)}
                      selected={selected.includes(s.id)}
                      padding="none"
                    >
                      {/* Image preview */}
                      {images.length > 0 && (
                        <div className="h-28 bg-muted relative overflow-hidden rounded-t-xl">
                          <img src={images[0]} alt="" className="w-full h-full object-cover" />
                          {images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                              +{images.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected.includes(s.id)}
                              onChange={(e) => { e.stopPropagation(); toggle(s.id) }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border"
                            />
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                              {(s.user?.first_name ?? '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {s.user?.first_name ?? '—'}
                              </p>
                            </div>
                          </div>
                          <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                            {s.status}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 truncate">
                          {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                          {s.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApprove(s.id) }}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const reason = window.prompt('Rejection reason (optional):')
                                  if (reason !== null) handleReject(s.id, reason || undefined)
                                }}
                                className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </DataCard>
                  )
                })}
              </div>
            )}

            {/* ── Kanban view ── */}
            {view === 'kanban' && (
              <KanbanBoard
                columns={kanbanColumns}
                getItemId={(item: any) => item.id}
                onMove={handleKanbanMove}
                renderCard={(item: any) => (
                  <div
                    className="cursor-pointer"
                    onClick={() => setDrawerSub(item)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                        {(item.user?.first_name ?? '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.user?.first_name ?? '—'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {item.product?.name_en ?? item.product?.name_uz ?? '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                )}
              />
            )}
          </>
        )}

        {/* Pagination (table/card only) */}
        {!isKanban && total > 0 && (
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
    </>
  )
}
