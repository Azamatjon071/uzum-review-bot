import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSubmissions, approveSubmission, rejectSubmission, deleteSubmission, bulkApprove, bulkReject,
} from '@/api'
import { cn, formatDate } from '@/lib/utils'
import {
  CheckCircle2, XCircle, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Eye, ZoomIn, ArrowUpDown, FileCheck,
  Clock, CheckCheck, Ban, Trash2, AlertTriangle,
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
import { Lightbox } from '@/components/ui/Lightbox'

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const statusVariantMap: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  duplicate: 'neutral',
}

const statusIconMap: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCheck,
  rejected: Ban,
}

// ── Helper: normalize images ─────────────────────────────────────────────────

function toImageUrls(images: any[]): string[] {
  return (images ?? []).map((img) => (typeof img === 'string' ? img : img?.url ?? '')).filter(Boolean)
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
  const StatusIcon = statusIconMap[sub.status]

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header with accent */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-1 uzum-gradient" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Submission Detail</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <StatusBadge variant={statusVariantMap[sub.status] ?? 'neutral'} dot>
              {sub.status}
            </StatusBadge>
            {StatusIcon && <StatusIcon className="w-4 h-4 text-muted-foreground" />}
          </div>

          {/* User card */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">User</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full uzum-gradient flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {(sub.user?.first_name ?? '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {sub.user?.first_name ?? '—'} {sub.user?.last_name ?? ''}
                </p>
                {sub.user?.username && (
                  <p className="text-xs text-muted-foreground">@{sub.user.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Product card */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Product</p>
            <p className="text-sm font-medium text-foreground">
              {sub.product?.name_en ?? sub.product?.name_uz ?? sub.product?.name_ru ?? '—'}
            </p>
          </div>

          {/* Date card */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Submitted</p>
            <p className="text-sm font-medium text-foreground">{formatDate(sub.created_at)}</p>
          </div>

          {/* Rejection reason */}
          {sub.rejection_reason && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
              <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1.5">Rejection Reason</p>
              <p className="text-sm text-destructive/80">{sub.rejection_reason}</p>
            </div>
          )}

          {/* Images gallery */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Screenshots ({images.length})
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="relative aspect-video rounded-xl bg-muted overflow-hidden border border-border hover:border-primary/50 hover:shadow-card transition-all group"
                  >
                    <img src={img} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {sub.status === 'pending' && (
          <div className="px-5 py-4 border-t border-border space-y-2.5 bg-card">
            {showReject ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (optional)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onReject(sub.id, rejectReason || undefined); onClose() }}
                    className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setRejectReason('') }}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { onApprove(sub.id); onClose() }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-semibold transition-colors shadow-sm"
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
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

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

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: () => {
      toast.success('Submission deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to delete'),
  })

  const submissions = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const pendingCount = submissions.filter((s: any) => s.status === 'pending').length

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
      id: 'pending',
      title: 'Pending',
      color: 'bg-amber-500',
      items: submissions.filter((s: any) => s.status === 'pending'),
    },
    {
      id: 'approved',
      title: 'Approved',
      color: 'bg-emerald-500',
      items: submissions.filter((s: any) => s.status === 'approved'),
    },
    {
      id: 'rejected',
      title: 'Rejected',
      color: 'bg-red-500',
      items: submissions.filter((s: any) => s.status === 'rejected'),
    },
  ]

  const handleKanbanMove = (itemId: string, fromCol: string, toCol: string) => {
    if (fromCol === toCol) return
    if (toCol === 'approved') {
      approveMut.mutate(itemId)
    } else if (toCol === 'rejected') {
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
        <ArrowUpDown className={cn('w-3 h-3', sortField === field && 'text-primary')} />
      </button>
    )
  }

  return (
    <>
      {lightbox && <Lightbox images={lightbox.images} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}
      {drawerSub && (
        <DetailDrawer
          sub={drawerSub}
          onClose={() => setDrawerSub(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 pointer-events-auto animate-scale-in">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Delete submission?</h3>
                </div>
                <button onClick={() => setDeleteTarget(null)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the submission from <strong>{deleteTarget.user?.first_name ?? 'this user'}</strong>. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMut.mutate(deleteTarget.id)}
                  disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className={dc.spacing}>
        {/* Header */}
        <PageHeader
          title="Submissions"
          description="Review and manage user submissions"
          icon={<FileCheck className="w-5 h-5 text-primary" />}
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
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg uzum-gradient flex items-center justify-center">
                <CheckCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {selected.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => bulkApproveMut.mutate()}
                disabled={bulkApproveMut.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
              </button>
              <button
                onClick={() => bulkRejectMut.mutate()}
                disabled={bulkRejectMut.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject All
              </button>
              <button
                onClick={() => setSelected([])}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="w-6 h-6 text-muted-foreground/60" />}
            title="No submissions found"
            description="Try adjusting your filters or check back later"
          />
        ) : (
          <>
            {/* ── Table view ── */}
            {view === 'table' && (
              <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className={cn('w-full', dc.text)}>
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className={cn(dc.padding, 'w-8')}>
                          <input
                            type="checkbox"
                            checked={selected.length === submissions.length && submissions.length > 0}
                            onChange={toggleAll}
                            className="rounded border-border accent-primary"
                          />
                        </th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>User</th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>Product</th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>
                          <SortHeader field="status">Status</SortHeader>
                        </th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>
                          <SortHeader field="created_at">Date</SortHeader>
                        </th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>Images</th>
                        <th className={cn(dc.padding, 'w-28')}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sorted.map((s: any) => {
                        const images = toImageUrls(s.images)
                        return (
                          <tr
                            key={s.id}
                            className={cn(
                              'hover:bg-muted/30 transition-colors cursor-pointer group',
                              selected.includes(s.id) && 'bg-primary/5',
                            )}
                            onClick={() => setDrawerSub(s)}
                          >
                            <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected.includes(s.id)}
                                onChange={() => toggle(s.id)}
                                className="rounded border-border accent-primary"
                              />
                            </td>
                            <td className={dc.padding}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                  {(s.user?.first_name ?? '?')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {s.user?.first_name ?? '—'}
                                  </p>
                                  {s.user?.username && (
                                    <p className="text-xs text-muted-foreground">@{s.user.username}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className={cn(dc.padding, 'text-muted-foreground truncate max-w-[180px]')}>
                              {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                            </td>
                            <td className={dc.padding}>
                              <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                                {s.status}
                              </StatusBadge>
                            </td>
                            <td className={cn(dc.padding, 'text-muted-foreground whitespace-nowrap')}>
                              {formatDate(s.created_at)}
                            </td>
                            <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              {images.length > 0 ? (
                                <button
                                  onClick={() => setLightbox({ images, index: 0 })}
                                  className="group relative w-12 h-12 rounded-lg bg-muted overflow-hidden border border-border hover:border-primary/50 transition-all shadow-sm"
                                  title="View photos"
                                >
                                  <img
                                    src={images[0]}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  />
                                  {images.length > 1 && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                      <span className="text-[10px] font-bold text-white">+{images.length - 1}</span>
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                             <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              {s.status === 'pending' ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleApprove(s.id)}
                                    disabled={approveMut.isPending}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
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
                                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDrawerSub(s)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(s)}
                                    className="p-1.5 rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setDrawerSub(s)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(s)}
                                    className="p-1.5 rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
              <div className={cn('grid gap-3', dc.gridCols)}>
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
                        <div className="h-32 bg-muted relative overflow-hidden rounded-t-xl">
                          <img src={images[0]} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          {images.length > 1 && (
                            <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                              +{images.length - 1}
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightbox({ images, index: 0 }) }}
                            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={selected.includes(s.id)}
                              onChange={(e) => { e.stopPropagation(); toggle(s.id) }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border accent-primary"
                            />
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {(s.user?.first_name ?? '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {s.user?.first_name ?? '—'}
                              </p>
                              {s.user?.username && (
                                <p className="text-[10px] text-muted-foreground">@{s.user.username}</p>
                              )}
                            </div>
                          </div>
                          <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                            {s.status}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 truncate">
                          {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <span className="text-[10px] text-muted-foreground font-medium">{formatDate(s.created_at)}</span>
                          <div className="flex gap-1">
                            {s.status === 'pending' && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApprove(s.id) }}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const reason = window.prompt('Rejection reason (optional):')
                                    if (reason !== null) handleReject(s.id, reason || undefined)
                                  }}
                                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
                              className="p-1.5 rounded-lg text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                renderCard={(item: any) => {
                  const images = toImageUrls(item.images)
                  return (
                    <div
                      className="cursor-pointer"
                      onClick={() => setDrawerSub(item)}
                    >
                      {/* Thumbnail */}
                      {images.length > 0 && (
                        <div className="h-20 -mx-3 -mt-2.5 mb-2.5 rounded-t-lg overflow-hidden relative">
                          <img src={images[0]} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          {images.length > 1 && (
                            <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                              +{images.length - 1}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
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
                  )
                }}
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 rounded-xl uzum-gradient text-white text-xs font-bold">
                {page}/{totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
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
