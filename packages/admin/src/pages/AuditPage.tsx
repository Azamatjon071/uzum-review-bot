import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/api'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'

const LIMIT = 30

const ACTION_COLOR: Record<string, string> = {
  admin_login_attempt:  'bg-blue-100 text-blue-700',
  'broadcast.sent':     'bg-purple-100 text-purple-700',
  'submission.approved':'bg-green-100 text-green-700',
  'submission.rejected':'bg-red-100 text-red-700',
  'user.banned':        'bg-orange-100 text-orange-700',
  'user.unbanned':      'bg-teal-100 text-teal-700',
  'prize.created':      'bg-indigo-100 text-indigo-700',
  'prize.updated':      'bg-indigo-100 text-indigo-700',
  'prize.deleted':      'bg-red-100 text-red-700',
}

export default function AuditPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => getAuditLogs({ page, limit: LIMIT }).then((r) => r.data),
  })

  const logs       = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const from       = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to         = Math.min(page * LIMIT, total)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total events</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['Time', 'Admin', 'Action', 'Resource', 'Details'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">No audit logs yet</td>
              </tr>
            ) : logs.map((l: any) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{formatDate(l.created_at)}</td>
                <td className="px-4 py-3 font-medium">{l.admin_name ?? l.admin_id ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[l.action] ?? 'bg-slate-100 text-slate-600'}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {l.resource_type}
                  {l.resource_id ? ` · ${l.resource_id.slice(0, 8)}…` : ''}
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-slate-500 text-xs font-mono">
                  {l.after_data
                    ? JSON.stringify(l.after_data)
                    : l.before_data
                    ? JSON.stringify(l.before_data)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium">{page}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
