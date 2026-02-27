import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSubmissions, approveSubmission, rejectSubmission, bulkApprove, bulkReject } from '@/api'
import { formatDate } from '@/lib/utils'
import {
  CheckCircle, XCircle, Clock, AlertCircle, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Eye, ZoomIn, FileText,
} from 'lucide-react'

const LIMIT = 20

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  APPROVED:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  REJECTED:  'bg-red-100 text-red-700 border border-red-200',
  DUPLICATE: 'bg-slate-100 text-slate-500 border border-slate-200',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', DUPLICATE: 'Duplicate',
}
const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  DUPLICATE: AlertCircle,
}

// ── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const [cur, setCur] = useState(index)
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X size={22} />
      </button>
      {cur > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCur((c) => c - 1) }}
          className="absolute left-4 text-white/70 hover:text-white p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <img
        src={images[cur]}
        alt="Review screenshot"
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {cur < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCur((c) => c + 1) }}
          className="absolute right-4 text-white/70 hover:text-white p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}
      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCur(i) }}
              className={`w-2 h-2 rounded-full transition-colors ${i === cur ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({
  sub,
  onClose,
  onApprove,
  onReject,
}: {
  sub: any
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const images: string[] = sub.images ?? []
  const StatusIcon = STATUS_ICON[sub.status] ?? AlertCircle

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">Submission Detail</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${STATUS_BADGE[sub.status] ?? ''}`}>
              <StatusIcon size={14} />
              {STATUS_LABEL[sub.status] ?? sub.status}
            </span>
          </div>

          {/* User info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                {(sub.user?.first_name ?? '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{sub.user?.first_name ?? '—'} {sub.user?.last_name ?? ''}</p>
                {sub.user?.username && <p className="text-sm text-slate-400">@{sub.user.username}</p>}
              </div>
            </div>
          </div>

          {/* Order info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Order #</p>
                <p className="font-mono font-semibold text-slate-800">{sub.order_number ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Submitted</p>
                <p className="font-semibold text-slate-800 text-xs">{formatDate(sub.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Review text */}
          {sub.review_text && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Review Text</p>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                {sub.review_text}
              </div>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Screenshots ({images.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden group border border-slate-200 hover:border-blue-400 transition-colors"
                  >
                    <img src={img} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {sub.status === 'PENDING' && (
          <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => { onApprove(sub.id); onClose() }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle size={16} /> Approve
            </button>
            <button
              onClick={() => { onReject(sub.id); onClose() }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle size={16} /> Reject
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SubmissionsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [drawerSub, setDrawerSub] = useState<any>(null)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', page, status],
    queryFn: () =>
      getSubmissions({ page, limit: LIMIT, status: status || undefined }).then((r) => r.data),
  })

  const approveMut = useMutation({
    mutationFn: approveSubmission,
    onSuccess: () => { toast.success('Approved'); qc.invalidateQueries({ queryKey: ['submissions'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed'),
  })
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectSubmission(id),
    onSuccess: () => { toast.success('Rejected'); qc.invalidateQueries({ queryKey: ['submissions'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed'),
  })
  const bulkApproveMut = useMutation({
    mutationFn: () => bulkApprove(selected),
    onSuccess: () => { toast.success(`Approved ${selected.length}`); setSelected([]); qc.invalidateQueries({ queryKey: ['submissions'] }) },
  })
  const bulkRejectMut = useMutation({
    mutationFn: () => bulkReject(selected),
    onSuccess: () => { toast.success(`Rejected ${selected.length}`); setSelected([]); qc.invalidateQueries({ queryKey: ['submissions'] }) },
  })

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const submissions = data?.items ?? []
  const total       = data?.total ?? 0
  const totalPages  = Math.max(1, Math.ceil(total / LIMIT))
  const from        = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to          = Math.min(page * LIMIT, total)

  // Quick stats (from all data)
  const statuses = submissions.reduce((acc: Record<string, number>, s: any) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      {/* Lightbox (for inline image clicks in table) */}
      {lightbox && (
        <Lightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}

      {/* Drawer */}
      {drawerSub && (
        <DetailDrawer
          sub={drawerSub}
          onClose={() => setDrawerSub(null)}
          onApprove={(id) => approveMut.mutate(id)}
          onReject={(id) => rejectMut.mutate(id)}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Submissions</h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} total reviews submitted</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm bg-white shadow-sm"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            {selected.length > 0 && (
              <>
                <button
                  onClick={() => bulkApproveMut.mutate()}
                  disabled={bulkApproveMut.isPending}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-sm font-medium"
                >
                  <CheckCircle size={14} /> Approve ({selected.length})
                </button>
                <button
                  onClick={() => bulkRejectMut.mutate()}
                  disabled={bulkRejectMut.isPending}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 shadow-sm font-medium"
                >
                  <XCircle size={14} /> Reject ({selected.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, color: 'border-l-blue-500', textColor: 'text-blue-600' },
            { label: 'Pending', value: statuses['PENDING'] ?? 0, color: 'border-l-yellow-500', textColor: 'text-yellow-600' },
            { label: 'Approved', value: statuses['APPROVED'] ?? 0, color: 'border-l-emerald-500', textColor: 'text-emerald-600' },
            { label: 'Rejected', value: statuses['REJECTED'] ?? 0, color: 'border-l-red-500', textColor: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl border border-slate-100 border-l-4 ${s.color} px-4 py-3 shadow-sm`}>
              <p className={`text-xl font-extrabold ${s.textColor}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === submissions.length && submissions.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? submissions.map((s: any) => s.id) : [])}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Review</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Images</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    No submissions found
                  </td>
                </tr>
              ) : submissions.map((s: any) => {
                const StatusIcon = STATUS_ICON[s.status] ?? AlertCircle
                const images: string[] = s.images ?? []
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setDrawerSub(s)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={() => toggle(s.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(s.user?.first_name ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm leading-tight">{s.user?.first_name ?? '—'}</div>
                          {s.user?.username && (
                            <div className="text-xs text-slate-400">@{s.user.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {s.order_number ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-slate-600 text-xs">
                        {s.review_text ?? <span className="text-slate-300 italic">No text</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {images.length > 0 ? (
                        <button
                          onClick={() => setLightbox({ images, index: 0 })}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          <ImageIcon size={12} />
                          {images.length}
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        <StatusIcon size={10} />
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {s.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => approveMut.mutate(s.id)}
                            disabled={approveMut.isPending}
                            className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs hover:bg-emerald-200 font-semibold disabled:opacity-50 transition-colors"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => rejectMut.mutate(s.id)}
                            disabled={rejectMut.isPending}
                            className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs hover:bg-red-200 font-semibold disabled:opacity-50 transition-colors"
                          >
                            ✕
                          </button>
                          <button
                            onClick={() => setDrawerSub(s)}
                            className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs hover:bg-slate-200 font-semibold transition-colors"
                          >
                            <Eye size={12} />
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

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="text-xs">
            {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
