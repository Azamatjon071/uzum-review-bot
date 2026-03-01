import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUsers, banUser, unbanUser, updateUser } from '@/api'
import { cn, formatDate } from '@/lib/utils'
import {
  Users, ShieldBan, ShieldCheck, Eye,
  ChevronLeft, ChevronRight, ArrowUpDown, X,
  FileText, CheckCircle2, Dices, Calendar,
  Hash, AtSign, Star, TrendingUp, AlertTriangle, Pencil,
  Plus, Minus,
} from 'lucide-react'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import type { ViewMode } from '@/hooks/useViewPreferences'
import PageHeader from '@/components/ui/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import ViewToggle from '@/components/ui/ViewToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'

/* ── Engagement helpers ── */

function calcEngagement(user: any): number {
  return (user.total_submissions ?? 0) * 10
    + (user.approved_submissions ?? 0) * 20
    + (user.total_spins ?? 0) * 5
}

function engagementTier(score: number): { label: string; variant: 'neutral' | 'info' | 'success' | 'warning'; color: string } {
  if (score >= 300) return { label: 'VIP', variant: 'warning', color: 'text-amber-600 dark:text-amber-400' }
  if (score >= 150) return { label: 'High', variant: 'success', color: 'text-emerald-600 dark:text-emerald-400' }
  if (score >= 50) return { label: 'Medium', variant: 'info', color: 'text-blue-600 dark:text-blue-400' }
  return { label: 'Low', variant: 'neutral', color: 'text-muted-foreground' }
}

const AVATAR_PALETTES = [
  { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300' },
]

function getPalette(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'banned', label: 'Banned' },
]

type SortField = 'username' | 'first_name' | 'total_submissions' | 'approved_submissions' | 'total_spins' | 'created_at'
type SortDir = 'asc' | 'desc'

/* ── Avatar ── */

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = (name?.[0] ?? '?').toUpperCase()
  const palette = getPalette(name)
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold shrink-0',
      palette.bg, palette.text,
      size === 'sm' && 'w-8 h-8 text-xs',
      size === 'md' && 'w-10 h-10 text-sm',
      size === 'lg' && 'w-14 h-14 text-xl',
    )}>
      {initial}
    </div>
  )
}

/* ── Stat Pill ── */

function StatPill({ icon: Icon, value, label, color }: {
  icon: React.ElementType
  value: number
  label: string
  color: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl py-2.5 px-3 gap-0.5', color)}>
      <Icon className="w-3.5 h-3.5 mb-0.5 opacity-70" />
      <span className="text-sm font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] font-medium opacity-60 leading-none">{label}</span>
    </div>
  )
}

/* ── Confirm Modal ── */

function ConfirmModal({ title, description, confirmLabel, confirmVariant = 'danger', onConfirm, onCancel, children }: {
  title: string
  description?: string
  confirmLabel: string
  confirmVariant?: 'danger' | 'success'
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 pointer-events-auto animate-scale-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center',
                confirmVariant === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600',
              )}>
                {confirmVariant === 'danger' ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {children}
          </div>
          <div className="flex gap-2 px-5 pb-5">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm',
                confirmVariant === 'danger'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── User Detail Drawer ── */

function UserDrawer({ user, onClose, onBan, onUnban }: {
  user: any
  onClose: () => void
  onBan: (user: any) => void
  onUnban: (user: any) => void
}) {
  const eng = calcEngagement(user)
  const tier = engagementTier(eng)
  const palette = getPalette(user.first_name ?? '?')

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 uzum-gradient" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">User Profile</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Hero card */}
          <div className="rounded-2xl border border-border bg-muted/20 p-5 text-center">
            <div className="flex justify-center mb-3">
              <UserAvatar name={user.first_name ?? '?'} size="lg" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              {user.first_name ?? ''} {user.last_name ?? ''}
            </h2>
            {user.username && (
              <p className="text-sm text-muted-foreground mt-0.5">@{user.username}</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2.5">
              <StatusBadge variant={user.is_banned ? 'error' : 'success'} dot size="sm">
                {user.is_banned ? 'Banned' : 'Active'}
              </StatusBadge>
              <StatusBadge variant={tier.variant} size="sm">
                <Star className="w-3 h-3 inline mr-0.5" />{tier.label}
              </StatusBadge>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <StatPill
              icon={FileText}
              value={user.total_submissions ?? 0}
              label="Subs"
              color="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
            />
            <StatPill
              icon={CheckCircle2}
              value={user.approved_submissions ?? 0}
              label="Approved"
              color="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatPill
              icon={Dices}
              value={user.total_spins ?? 0}
              label="Spins"
              color="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
            />
          </div>

          {/* Engagement bar */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Engagement Score
              </span>
              <span className={cn('text-xs font-bold', tier.color)}>{eng} pts</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full uzum-gradient transition-all duration-700"
                style={{ width: `${Math.min(100, (eng / 500) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Low</span><span>Medium</span><span>High</span><span>VIP</span>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {[
              { icon: Hash, label: 'Telegram ID', value: String(user.telegram_id ?? '—') },
              { icon: AtSign, label: 'Username', value: user.username ? `@${user.username}` : '—' },
              { icon: Calendar, label: 'Joined', value: formatDate(user.created_at) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 bg-muted/10">
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                <span className="text-xs font-medium text-foreground truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer action */}
        <div className="px-5 py-4 border-t border-border">
          {user.is_banned ? (
            <button
              onClick={() => { onUnban(user); onClose() }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Unban User
            </button>
          ) : (
            <button
              onClick={() => { onBan(user); onClose() }}
              className="w-full py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ShieldBan className="w-4 h-4" /> Ban User
            </button>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Edit User Drawer ── */

function EditUserDrawer({ user, onClose, onSave }: {
  user: any
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
}) {
  const [firstName, setFirstName] = useState(user.first_name ?? '')
  const [lastName, setLastName] = useState(user.last_name ?? '')
  const [username, setUsername] = useState(user.username ?? '')
  const [spinDelta, setSpinDelta] = useState(0)
  const [language, setLanguage] = useState(user.language ?? 'uz')

  const handleSubmit = () => {
    const data: Record<string, unknown> = {}
    if (firstName !== (user.first_name ?? '')) data.first_name = firstName || null
    if (lastName !== (user.last_name ?? '')) data.last_name = lastName || null
    if (username !== (user.username ?? '')) data.username = username || null
    if (spinDelta !== 0) data.spin_count_delta = spinDelta
    if (language !== user.language) data.language = language
    onSave(data)
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        <div className="absolute inset-x-0 top-0 h-1 uzum-gradient" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Edit User</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Spin count delta */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spin Adjustment</p>
            <p className="text-xs text-muted-foreground">Add or subtract spins from the user's balance.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSpinDelta((d) => d - 1)}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className={cn(
                'flex-1 text-center text-lg font-bold tabular-nums',
                spinDelta > 0 && 'text-emerald-600 dark:text-emerald-400',
                spinDelta < 0 && 'text-destructive',
                spinDelta === 0 && 'text-foreground',
              )}>
                {spinDelta > 0 ? `+${spinDelta}` : spinDelta}
              </span>
              <button
                onClick={() => setSpinDelta((d) => d + 1)}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {spinDelta !== 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Current: {user.total_spins ?? 0} → After: {Math.max(0, (user.spin_count ?? user.total_spins ?? 0) + spinDelta)}
              </p>
            )}
          </div>

          {/* Language */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</p>
            <div className="grid grid-cols-3 gap-2">
              {(['uz', 'ru', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    'py-2 rounded-xl text-sm font-medium border transition-all',
                    language === lang
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {lang === 'uz' ? '🇺🇿 UZ' : lang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl uzum-gradient text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Main ── */

export default function UsersPage() {
  const qc = useQueryClient()
  const { density, getView, setView } = useViewPreferences()
  const dc = densityClasses[density]
  const view = getView('users', 'card') as ViewMode

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [drawerUser, setDrawerUser] = useState<any>(null)
  const [editModal, setEditModal] = useState<any>(null)
  const [banModal, setBanModal] = useState<{ user: any; reason: string } | null>(null)
  const [unbanModal, setUnbanModal] = useState<any>(null)

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
    onSuccess: () => { toast.success('User banned'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Failed to ban user'),
  })

  const unbanMut = useMutation({
    mutationFn: (id: string) => unbanUser(id),
    onSuccess: () => { toast.success('User unbanned'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Failed to unban user'),
  })

  const editMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateUser(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); setEditModal(null) },
    onError: () => toast.error('Failed to update user'),
  })

  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const sorted = [...users].sort((a: any, b: any) => {
    const av = a[sortField] ?? ''
    const bv = b[sortField] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filterChips = STATUS_FILTERS.map((f) => ({ key: f.key, label: f.label, active: statusFilter === f.key }))
  const handleChip = (key: string) => { setStatusFilter(key); setPage(1) }
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  // Ban: open modal, then execute
  const initBan = (user: any) => setBanModal({ user, reason: '' })
  const confirmBan = () => {
    if (!banModal) return
    banMut.mutate({ id: banModal.user.id, reason: banModal.reason || 'Banned by admin' })
    setBanModal(null)
  }

  // Unban: open confirm modal, then execute
  const initUnban = (user: any) => setUnbanModal(user)
  const confirmUnban = () => {
    if (!unbanModal) return
    unbanMut.mutate(unbanModal.id)
    setUnbanModal(null)
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <button onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        {children}
        <ArrowUpDown className={cn('w-3 h-3', sortField === field && 'text-primary')} />
      </button>
    )
  }

  return (
    <>
      {/* Edit User Drawer */}
      {editModal && (
        <EditUserDrawer
          user={editModal}
          onClose={() => setEditModal(null)}
          onSave={(data) => {
            if (Object.keys(data).length === 0) { setEditModal(null); return }
            editMut.mutate({ id: editModal.id, data })
          }}
        />
      )}

      {/* User Drawer */}
      {drawerUser && (
        <UserDrawer
          user={drawerUser}
          onClose={() => setDrawerUser(null)}
          onBan={(u) => { setDrawerUser(null); initBan(u) }}
          onUnban={(u) => { setDrawerUser(null); initUnban(u) }}
        />
      )}

      {/* Ban confirm modal */}
      {banModal && (
        <ConfirmModal
          title={`Ban ${banModal.user.first_name ?? 'user'}?`}
          description="This will prevent them from using the platform. You can unban them later."
          confirmLabel="Ban User"
          confirmVariant="danger"
          onConfirm={confirmBan}
          onCancel={() => setBanModal(null)}
        >
          <input
            type="text"
            value={banModal.reason}
            onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
            placeholder="Reason (optional)"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            autoFocus
          />
        </ConfirmModal>
      )}

      {/* Unban confirm modal */}
      {unbanModal && (
        <ConfirmModal
          title={`Unban ${unbanModal.first_name ?? 'user'}?`}
          description="They will regain full access to the platform."
          confirmLabel="Unban User"
          confirmVariant="success"
          onConfirm={confirmUnban}
          onCancel={() => setUnbanModal(null)}
        />
      )}

      <div className={dc.spacing}>
        <PageHeader
          title="Users"
          description="Manage platform users and their access"
          icon={<Users className="w-5 h-5 text-primary" />}
          badge={<StatusBadge variant="info" size="sm">{total.toLocaleString()} total</StatusBadge>}
          actions={
            <ViewToggle
              current={view}
              onChange={(m) => setView('users', m)}
              options={['table', 'card', 'list']}
            />
          }
        />

        <FilterBar
          searchValue={search}
          onSearchChange={handleSearch}
          searchPlaceholder="Search name or username..."
          chips={filterChips}
          onChipToggle={handleChip}
        />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={<Users className="w-6 h-6 text-muted-foreground/60" />} title="No users found" description="Try adjusting your search or filters" />
        ) : (
          <>
            {/* ── Table ── */}
            {view === 'table' && (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className={cn('w-full', dc.text)}>
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}><SortHeader field="first_name">User</SortHeader></th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}><SortHeader field="total_submissions">Submissions</SortHeader></th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}><SortHeader field="total_spins">Spins</SortHeader></th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>Engagement</th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}>Status</th>
                        <th className={cn(dc.padding, 'text-left font-medium text-muted-foreground')}><SortHeader field="created_at">Joined</SortHeader></th>
                        <th className={cn(dc.padding, 'w-16')} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sorted.map((u: any) => {
                        const eng = calcEngagement(u)
                        const tier = engagementTier(eng)
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-muted/30 transition-colors group cursor-pointer"
                            onClick={() => setDrawerUser(u)}
                          >
                            <td className={dc.padding}>
                              <div className="flex items-center gap-2.5">
                                <UserAvatar name={u.first_name ?? '?'} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {u.first_name ?? ''} {u.last_name ?? ''}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className={dc.padding}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold tabular-nums text-foreground">{u.total_submissions ?? 0}</span>
                                {(u.approved_submissions ?? 0) > 0 && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    ({u.approved_submissions} ✓)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={cn(dc.padding, 'text-sm font-semibold tabular-nums text-foreground')}>{u.total_spins ?? 0}</td>
                            <td className={dc.padding}>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full uzum-gradient"
                                    style={{ width: `${Math.min(100, (eng / 500) * 100)}%` }}
                                  />
                                </div>
                                <span className={cn('text-xs font-semibold', tier.color)}>{tier.label}</span>
                              </div>
                            </td>
                            <td className={dc.padding}>
                              <StatusBadge variant={u.is_banned ? 'error' : 'success'} dot size="sm">
                                {u.is_banned ? 'Banned' : 'Active'}
                              </StatusBadge>
                            </td>
                            <td className={cn(dc.padding, 'text-muted-foreground whitespace-nowrap text-xs')}>{formatDate(u.created_at)}</td>
                            <td className={dc.padding} onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                 <button
                                   onClick={() => setDrawerUser(u)}
                                   className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                   title="View"
                                 >
                                   <Eye className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   onClick={() => setEditModal(u)}
                                   className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                   title="Edit"
                                 >
                                   <Pencil className="w-3.5 h-3.5" />
                                 </button>
                                 {u.is_banned ? (
                                  <button
                                    onClick={() => initUnban(u)}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                    title="Unban"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => initBan(u)}
                                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Ban"
                                  >
                                    <ShieldBan className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Card ── */}
            {view === 'card' && (
              <div className={cn('grid gap-3', dc.gridCols)}>
                {sorted.map((u: any) => {
                  const eng = calcEngagement(u)
                  const tier = engagementTier(eng)
                  return (
                    <DataCard key={u.id} onClick={() => setDrawerUser(u)} padding="none">
                      {/* Top gradient accent */}
                      <div className="h-1 rounded-t-xl uzum-gradient" />
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.first_name ?? '?'} />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate text-sm">
                                {u.first_name ?? ''} {u.last_name ?? ''}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                              </p>
                            </div>
                          </div>
                          <StatusBadge variant={u.is_banned ? 'error' : 'success'} dot size="sm">
                            {u.is_banned ? 'Banned' : 'Active'}
                          </StatusBadge>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center rounded-lg bg-violet-50 dark:bg-violet-500/10 py-2">
                            <p className="text-sm font-bold text-violet-700 dark:text-violet-300 tabular-nums">{u.total_submissions ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Subs</p>
                          </div>
                          <div className="text-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 py-2">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{u.approved_submissions ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Approved</p>
                          </div>
                          <div className="text-center rounded-lg bg-amber-50 dark:bg-amber-500/10 py-2">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">{u.total_spins ?? 0}</p>
                            <p className="text-[10px] text-muted-foreground">Spins</p>
                          </div>
                        </div>

                        {/* Engagement bar */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">Engagement</span>
                            <span className={cn('text-[10px] font-bold', tier.color)}>{tier.label} · {eng}pts</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full uzum-gradient transition-all duration-700"
                              style={{ width: `${Math.min(100, (eng / 500) * 100)}%` }}
                            />
                          </div>
                        </div>

                         {/* Actions */}
                         <div className="flex gap-1.5 pt-3 border-t border-border/50">
                           <button
                             onClick={(e) => { e.stopPropagation(); setDrawerUser(u) }}
                             className="flex-1 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1"
                           >
                             <Eye className="w-3 h-3" /> View
                           </button>
                           <button
                             onClick={(e) => { e.stopPropagation(); setEditModal(u) }}
                             className="flex-1 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                           >
                             <Pencil className="w-3 h-3" /> Edit
                           </button>
                           {u.is_banned ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); initUnban(u) }}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" /> Unban
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); initBan(u) }}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1"
                            >
                              <ShieldBan className="w-3 h-3" /> Ban
                            </button>
                          )}
                        </div>
                      </div>
                    </DataCard>
                  )
                })}
              </div>
            )}

            {/* ── List ── */}
            {view === 'list' && (
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-card">
                {sorted.map((u: any) => {
                  const eng = calcEngagement(u)
                  const tier = engagementTier(eng)
                  return (
                    <div
                      key={u.id}
                      className={cn('flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer group', dc.padding)}
                      onClick={() => setDrawerUser(u)}
                    >
                      <UserAvatar name={u.first_name ?? '?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {u.first_name ?? ''} {u.last_name ?? ''}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums">{u.total_submissions ?? 0} subs</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className={cn('text-xs font-semibold', tier.color)}>{tier.label}</span>
                      </div>
                      <StatusBadge variant={u.is_banned ? 'error' : 'success'} dot size="sm">
                        {u.is_banned ? 'Banned' : 'Active'}
                      </StatusBadge>
                       <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                         <button onClick={() => setEditModal(u)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                           <Pencil className="w-3.5 h-3.5" />
                         </button>
                         {u.is_banned ? (
                           <button onClick={() => initUnban(u)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Unban">
                             <ShieldCheck className="w-3.5 h-3.5" />
                           </button>
                         ) : (
                           <button onClick={() => initBan(u)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Ban">
                             <ShieldBan className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="text-xs">Showing {from}–{to} of {total.toLocaleString()} users</span>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 rounded-xl uzum-gradient text-white text-xs font-bold">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
