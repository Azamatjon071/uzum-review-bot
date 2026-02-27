import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUsers, getUserDetail, banUser, unbanUser, rewardUser, getAnalyticsOverview } from '@/api'
import { formatDate } from '@/lib/utils'
import { Users, UserCheck, UserX, Gift, X, Trophy, Star, TrendingUp } from 'lucide-react'

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

const PRIZE_TYPES = [
  { value: 'GIFT', label: 'Gift Card' },
  { value: 'FREE_PRODUCT', label: 'Free Product' },
  { value: 'DISCOUNT', label: 'Discount Coupon' },
  { value: 'CHARITY_DONATION', label: 'Charity Donation' },
  { value: 'CASHBACK', label: 'Store Cashback' },
]

// ── Grant Reward Modal ───────────────────────────────────────────────────────

function GrantRewardModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [prizeType, setPrizeType] = useState('GIFT')
  const [note, setNote] = useState('')

  const mut = useMutation({
    mutationFn: () => rewardUser(userId, { prize_type: prizeType, note }),
    onSuccess: () => {
      toast.success(`Reward granted to ${userName}`)
      onClose()
    },
    onError: () => toast.error('Failed to grant reward'),
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Gift size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Grant Reward</h3>
                <p className="text-xs text-slate-400">to {userName}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prize Type</label>
              <div className="grid grid-cols-1 gap-1.5">
                {PRIZE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setPrizeType(t.value)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      prizeType === t.value
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${prizeType === t.value ? 'bg-violet-500' : 'bg-slate-300'}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Compensation for issue #1234"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>
          <div className="p-5 pt-0 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {mut.isPending ? 'Granting…' : 'Grant Reward'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── User detail drawer ───────────────────────────────────────────────────────

function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [banReason, setBanReason] = useState('')
  const [showBanInput, setShowBanInput] = useState(false)
  const [showGrantModal, setShowGrantModal] = useState(false)

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

  const avatarColors = ['from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-amber-600']
  const avatarGrad = user ? avatarColors[(user.first_name?.charCodeAt(0) ?? 0) % avatarColors.length] : avatarColors[0]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-lg font-bold text-slate-800">User Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + i * 7}%` }} />
              ))}
            </div>
          ) : user ? (
            <>
              {/* Profile hero */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-2xl font-black shadow-lg flex-shrink-0`}>
                    {(user.first_name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-xl leading-tight truncate">
                      {user.first_name} {user.last_name ?? ''}
                    </p>
                    {user.username && (
                      <p className="text-blue-600 text-sm font-medium">@{user.username}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${user.is_banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {user.is_banned ? '🚫 Banned' : '✅ Active'}
                      </span>
                      <span className="text-xs text-slate-400 uppercase tracking-wide bg-slate-200 px-2 py-0.5 rounded-full">{user.language}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Submissions', value: user.total_submissions, icon: '📋', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Approved', value: user.approved_submissions, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Spins', value: user.total_spins, icon: '🎰', color: 'text-violet-600', bg: 'bg-violet-50' },
                ].map(({ label, value, icon, color, bg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                    <p className="text-xl mb-0.5">{icon}</p>
                    <p className={`text-2xl font-black ${color}`}>{value ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Telegram ID', value: user.telegram_id },
                  { label: 'User ID', value: user.id?.slice(0, 8) + '…' },
                  { label: 'Joined', value: formatDate(user.created_at) },
                  { label: 'Referral Code', value: user.referral_code ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">{label}</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Ban info */}
              {user.is_banned && user.ban_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Ban Reason</p>
                  <p className="text-sm text-red-800">{user.ban_reason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {/* Grant Reward button */}
                <button
                  onClick={() => setShowGrantModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-500/20"
                >
                  <Gift size={15} />
                  Grant Reward
                </button>

                {/* Ban/Unban */}
                {user.is_banned ? (
                  <button
                    onClick={() => unbanMut.mutate()}
                    disabled={unbanMut.isPending}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {unbanMut.isPending ? 'Unbanning…' : '✅ Unban User'}
                  </button>
                ) : showBanInput ? (
                  <div className="space-y-2">
                    <input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Ban reason (optional)"
                      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => banMut.mutate()}
                        disabled={banMut.isPending}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {banMut.isPending ? 'Banning…' : 'Confirm Ban'}
                      </button>
                      <button
                        onClick={() => { setShowBanInput(false); setBanReason('') }}
                        className="px-4 py-2 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBanInput(true)}
                    className="w-full py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
                  >
                    🚫 Ban User
                  </button>
                )}
              </div>

              {/* Recent Submissions */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Recent Submissions</h3>
                {user.recent_submissions?.length > 0 ? (
                  <div className="space-y-1.5">
                    {user.recent_submissions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                        <span className="font-mono text-xs text-slate-400">#{s.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-500">{formatDate(s.created_at)}</span>
                        <StatusBadge value={s.status} map={submissionStatusMap} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-slate-100">No submissions yet</p>
                )}
              </div>

              {/* Recent Rewards */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Recent Rewards</h3>
                {user.recent_rewards?.length > 0 ? (
                  <div className="space-y-1.5">
                    {user.recent_rewards.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                        <span className="font-mono text-xs text-slate-400">#{r.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-500 font-mono">{r.claim_code ?? '—'}</span>
                        <StatusBadge value={r.status} map={rewardStatusMap} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-slate-100">No rewards yet</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-slate-400 py-12">User not found</p>
          )}
        </div>
      </div>

      {showGrantModal && user && (
        <GrantRewardModal
          userId={userId}
          userName={`${user.first_name} ${user.last_name ?? ''}`.trim()}
          onClose={() => setShowGrantModal(false)}
        />
      )}
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
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

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => getAnalyticsOverview().then((r) => r.data),
    staleTime: 60_000,
  })

  const users      = data?.items ?? []
  const total      = data?.total ?? 0
  const LIMIT      = 20
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const from       = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to         = Math.min(page * LIMIT, total)

  const activeCount  = overview?.total_users ?? total
  const bannedCount  = users.filter((u: any) => u.is_banned).length

  const statCards = [
    { label: 'Total Users',    value: activeCount.toLocaleString(), icon: Users,     color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
    { label: 'Active Users',   value: (overview?.total_users ?? '—').toLocaleString?.() ?? '—', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Total Spins',    value: (overview?.total_spins ?? '—').toLocaleString?.() ?? '—', icon: Star,      color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
    { label: 'Active Page',    value: `${from}–${to} of ${total}`, icon: TrendingUp, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Users</h1>
          <p className="text-sm text-slate-400 mt-0.5">{total.toLocaleString()} registered users</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm p-4`}>
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-black ${color} leading-tight`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex rounded-xl border overflow-hidden shadow-sm text-sm">
          {([
            { v: 'all', label: 'All Users' },
            { v: 'active', label: '✅ Active' },
            { v: 'banned', label: '🚫 Banned' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => { setFilterBanned(v); setPage(1) }}
              className={`px-4 py-2 transition-colors font-medium ${filterBanned === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name / username…"
            className="border rounded-xl pl-8 pr-3 py-2 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['User', 'Telegram ID', 'Language', 'Submissions', 'Spins', 'Joined', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users size={24} className="text-slate-300" />
                    </div>
                    <p className="font-medium">No users found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : users.map((u: any) => (
                <tr
                  key={u.id}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm">
                        {(u.first_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.first_name} {u.last_name ?? ''}</p>
                        {u.username && <p className="text-xs text-slate-400">@{u.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 bg-slate-50/50">{u.telegram_id}</td>
                  <td className="px-4 py-3">
                    <span className="uppercase text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{u.language}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">{u.total_submissions}</span>
                      {u.approved_submissions > 0 && (
                        <span className="text-xs text-emerald-600 font-medium">({u.approved_submissions} ✓)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-600">{u.total_spins}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {u.is_banned ? '🚫 Banned' : '✅ Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedUserId(u.id) }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
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
        <span className="font-medium">
          {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total.toLocaleString()} users`}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors font-medium"
          >
            ← Prev
          </button>
          <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors font-medium"
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
