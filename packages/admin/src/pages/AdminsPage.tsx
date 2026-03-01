import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAdmins, createAdmin, deleteAdmin, getRoles } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus, Trash2, Shield, ShieldCheck, ShieldOff, X, Loader2, Mail, Eye, EyeOff,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import ViewToggle from '@/components/ui/ViewToggle'
import DataCard from '@/components/ui/DataCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

/* ── Types ──────────────────────────────────────────────── */

interface Role {
  id: number
  name: string
  permissions: string[]
}

interface Admin {
  id: string
  email: string
  full_name?: string
  role_id?: number
  role?: Role
  is_active: boolean
  is_totp_enabled: boolean
  is_superadmin?: boolean
  last_login_at?: string
  last_login_ip?: string
  created_at: string
}

/* ── Role badge color mapping ───────────────────────────── */

const ROLE_VARIANT: Record<string, 'primary' | 'info' | 'warning' | 'success' | 'neutral'> = {
  superadmin: 'primary',
  admin: 'info',
  moderator: 'warning',
  viewer: 'neutral',
}

function roleBadgeVariant(name?: string): 'primary' | 'info' | 'warning' | 'success' | 'neutral' {
  if (!name) return 'neutral'
  return ROLE_VARIANT[name.toLowerCase()] ?? 'success'
}

/* ── Initials avatar ────────────────────────────────────── */

function initialsFor(admin: Admin): string {
  if (admin.full_name) {
    return admin.full_name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return admin.email.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
]

function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/* ── Drawer ─────────────────────────────────────────────── */

function AddAdminDrawer({
  open,
  onClose,
  roles,
  onSubmit,
  isPending,
}: {
  open: boolean
  onClose: () => void
  roles: Role[]
  onSubmit: (data: { email: string; full_name: string; password: string; role_id: number | null }) => void
  isPending: boolean
}) {
  const [showPassword, setShowPassword] = useState(false)

  if (!open) return null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit({
      email: fd.get('email') as string,
      full_name: (fd.get('full_name') as string) || '',
      password: fd.get('password') as string,
      role_id: fd.get('role_id') ? Number(fd.get('role_id')) : null,
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md animate-slide-in-right">
        <div className="flex h-full flex-col bg-card border-l border-border shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Add Administrator</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                name="full_name"
                autoComplete="off"
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Strong password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
              <select
                name="role_id"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              >
                <option value="">No role assigned</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              form=""
              onClick={(e) => {
                const form = e.currentTarget.closest('.flex')?.previousElementSibling?.querySelector('form')
                if (form) form.requestSubmit()
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Delete confirmation dialog ─────────────────────────── */

function ConfirmDialog({
  open,
  admin,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean
  admin: Admin | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  if (!open || !admin) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-card border border-border shadow-2xl p-6 animate-fade-in">
          <h3 className="text-base font-semibold text-foreground">Remove Administrator</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-medium text-foreground">{admin.email}</span>?
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Main Page ──────────────────────────────────────────── */

export default function AdminsPage() {
  const qc = useQueryClient()
  const { getView, setView, density } = useViewPreferences()
  const view = getView('admins', 'table')
  const dc = densityClasses[density]

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)

  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => getAdmins().then((r) => r.data),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      toast.success('Administrator created')
      setDrawerOpen(false)
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? 'Failed to create admin'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      toast.success('Administrator removed')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: () => toast.error('Failed to remove admin'),
  })

  const admins: Admin[] = adminsData?.admins ?? []
  const roles: Role[] = rolesData?.roles ?? []

  function relativeLogin(admin: Admin): string {
    if (!admin.last_login_at) return 'Never'
    return formatDistanceToNow(new Date(admin.last_login_at), { addSuffix: true })
  }

  /* ── Table view ───────────────────────────────────────── */

  function renderTable() {
    return (
      <DataCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={clsx('w-full min-w-[700px]', dc.text)}>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Name', 'Email', 'Role', 'TOTP', 'Last Login', 'Active', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={clsx(
                      'text-left font-medium text-muted-foreground',
                      dc.padding,
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className={clsx(dc.padding)}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={clsx(
                          'flex items-center justify-center rounded-full font-semibold shrink-0',
                          avatarColor(a.id),
                          density === 'compact' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs',
                        )}
                      >
                        {initialsFor(a)}
                      </div>
                      <span className="font-medium text-foreground truncate">
                        {a.full_name || a.email.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td className={clsx(dc.padding, 'text-muted-foreground')}>{a.email}</td>
                  <td className={dc.padding}>
                    <StatusBadge variant={roleBadgeVariant(a.role?.name)}>
                      {a.role?.name ?? 'None'}
                    </StatusBadge>
                  </td>
                  <td className={dc.padding}>
                    {a.is_totp_enabled ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ShieldOff className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </td>
                  <td className={clsx(dc.padding, 'text-muted-foreground text-xs')}>
                    {relativeLogin(a)}
                  </td>
                  <td className={dc.padding}>
                    <StatusBadge variant={a.is_active ? 'success' : 'neutral'} dot>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                  <td className={dc.padding}>
                    {!a.is_superadmin && (
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    )
  }

  /* ── Card view ────────────────────────────────────────── */

  function renderCards() {
    return (
      <div className={clsx('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3', dc.gap)}>
        {admins.map((a) => (
          <DataCard key={a.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm',
                    avatarColor(a.id),
                  )}
                >
                  {initialsFor(a)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {a.full_name || a.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                </div>
              </div>
              {a.is_totp_enabled ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <ShieldOff className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <StatusBadge variant={roleBadgeVariant(a.role?.name)}>
                {a.role?.name ?? 'No role'}
              </StatusBadge>
              <StatusBadge variant={a.is_active ? 'success' : 'neutral'} dot>
                {a.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Last login: {relativeLogin(a)}</span>
              {!a.is_superadmin && (
                <button
                  onClick={() => setDeleteTarget(a)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remove admin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </DataCard>
        ))}
      </div>
    )
  }

  /* ── Loading skeleton ─────────────────────────────────── */

  function renderSkeleton() {
    return (
      <DataCard padding="none" className="overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </DataCard>
    )
  }

  return (
    <div className={clsx('space-y-5', dc.spacing)}>
      <PageHeader
        title="Administrators"
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle
              current={view}
              onChange={(m) => setView('admins', m)}
              options={['table', 'card']}
            />
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </button>
          </div>
        }
      />

      {isLoading ? (
        renderSkeleton()
      ) : admins.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-6 h-6 text-muted-foreground" />}
          title="No administrators"
          description="Create your first administrator to get started."
          action={
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </button>
          }
        />
      ) : view === 'table' ? (
        renderTable()
      ) : (
        renderCards()
      )}

      <AddAdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        roles={roles}
        onSubmit={(data) => createMut.mutate(data)}
        isPending={createMut.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        admin={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        isPending={deleteMut.isPending}
      />
    </div>
  )
}
