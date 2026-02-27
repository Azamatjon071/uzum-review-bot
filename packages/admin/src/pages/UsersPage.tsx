import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUsers, getUserDetail, banUser, unbanUser } from '@/api'
import { formatDate } from '@/lib/utils'

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ value, map }: { value: string; map: Record<string, { label: string; cls: string }> }) {
  const entry = map[value] ?? { label: value, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entry.cls}`}>{entry.label}</span>
}

const submissionStatusMap: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
}

const rewardStatusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  claimed: { label: 'Claimed', cls: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', cls: 'bg-slate-100 text-slate-500' },
}

// ── User detail drawer ───────────────────────────────────────────────────────

function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [banReason, setBanReason] = useState('')
  const [showBanInput, setShowBanInput] = useState(false)

  const { data: user, isLoading } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: () => getUserDetail(userId).then((r) => r.data),
    enabled: !!userId,
  })

  const banMut = useMutation({
    mutationFn: () => banUser(userId, banReason || 'Banned by admin'),
    onSuccess: () => {
      toast.success('User banned')
      setShowBanInput(false)
      setBanReason('')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-detail', userId] })
    },
    onError: () => toast.error('Failed to ban user'),
  })

  const unbanMut = useMutation({
    mutationFn: () => unbanUser(userId),
    onSuccess: () => {
      toast.success('User unbanned')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-detail', userId] })
    },
    onError: () => toast.error('Failed to unban user'),
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">User Detail</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : user ? (
            <>
              {/* Profile card */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {(user.first_name?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-lg truncate">
                    {user.first_name} {user.last_name ?? ''}
                  </p>
                  {user.username && (
                    <p className="text-blue-600 text-sm">@{user.username}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.is_banned ? '🚫 Banned' : '✅ Active'}
                    </span>
                    <span className="text-xs text-slate-400 uppercase tracking-wide">{user.language}</span>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Telegram ID', value: user.telegram_id },
                  { label: 'User ID', value: user.id.slice(0, 8) + '…' },
                  { label: 'Joined', value: formatDate(user.created_at) },
                  { label: 'Referral Code', value: user.referral_code ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Submissions', value: user.total_submissions, color: 'text-blue-600' },
                  { label: 'Approved', value: user.approved_submissions, color: 'text-green-600' },
                  { label: 'Spins', value: user.total_spins, color: 'text-purple-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white border rounded-xl p-3 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Ban info */}
              {user.is_banned && user.ban_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-600 mb-1">Ban Reason</p>
                  <p className="text-sm text-red-800">{user.ban_reason}</p>
                </div>
              )}

              {/* Ban/Unban actions */}
              <div>
                {user.is_banned ? (
                  <button
                    onClick={() => unbanMut.mutate()}
                    disabled={unbanMut.isPending}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {unbanMut.isPending ? 'Unbanning…' : '✅ Unban User'}
                  </button>
                ) : showBanInput ? (
                  <div className="space-y-2">
                    <input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Ban reason (optional)"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => banMut.mutate()}
                        disabled={banMut.isPending}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {banMut.isPending ? 'Banning…' : 'Confirm Ban'}
                      </button>
                      <button
                        onClick={() => { setShowBanInput(false); setBanReason('') }}
                        className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBanInput(true)}
                    className="w-full py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    🚫 Ban User
                  </button>
                )}
              </div>

              {/* Recent Submissions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Submissions</h3>
                {user.recent_submissions?.length > 0 ? (
                  <div className="space-y-2">
                    {user.recent_submissions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-mono text-xs text-slate-400">#{s.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-500">{formatDate(s.created_at)}</span>
                        <StatusBadge value={s.status} map={submissionStatusMap} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No submissions yet</p>
                )}
              </div>

              {/* Recent Rewards */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Rewards</h3>
                {user.recent_rewards?.length > 0 ? (
                  <div className="space-y-2">
                    {user.recent_rewards.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-mono text-xs text-slate-400">#{r.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-500 font-mono">{r.claim_code ?? '—'}</span>
                        <StatusBadge value={r.status} map={rewardStatusMap} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No rewards yet</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-slate-400 py-12">User not found</p>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterBanned, setFilterBanned] = useState<'all' | 'active' | 'banned'>('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, filterBanned],
    queryFn: () =>
      getUsers({
        page,
        limit: 20,
        search: search || undefined,
        is_banned: filterBanned === 'all' ? undefined : filterBanned === 'banned',
      }).then((r) => r.data),
  })

  const users      = data?.items ?? []
  const total      = data?.total ?? 0
  const LIMIT      = 20
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const from       = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to         = Math.min(page * LIMIT, total)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-400 mt-0.5">{total.toLocaleString()} total users</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(['all', 'active', 'banned'] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setFilterBanned(v); setPage(1) }}
                className={`px-3 py-1.5 transition-colors ${filterBanned === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name / username…"
              className="border rounded-lg pl-8 pr-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['User', 'Telegram ID', 'Language', 'Submissions', 'Spins', 'Joined', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <p className="text-3xl mb-2">👥</p>
                    <p>No users found</p>
                  </td>
                </tr>
              ) : users.map((u: any) => (
                <tr
                  key={u.id}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.first_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.first_name}</p>
                        {u.username && <p className="text-xs text-slate-400">@{u.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.telegram_id}</td>
                  <td className="px-4 py-3">
                    <span className="uppercase text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{u.language}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">{u.total_submissions}</span>
                      {u.approved_submissions > 0 && (
                        <span className="text-xs text-green-600">({u.approved_submissions} ✓)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.total_spins}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.is_banned ? '🚫 Banned' : '✅ Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedUserId(u.id) }}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            ← Prev
          </button>
          <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">{page}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedUserId && (
        <UserDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}
