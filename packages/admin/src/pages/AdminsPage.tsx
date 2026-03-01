import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus, Trash2, Shield, ShieldCheck, ShieldOff, X, Loader2,
  Eye, EyeOff, AlertTriangle, Mail, KeyRound, UserCircle2,
} from 'lucide-react'
import { getAdmins, createAdmin, deleteAdmin, getRoles } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import ViewToggle from '@/components/ui/ViewToggle'
import DensityToggle from '@/components/ui/DensityToggle'

/* ── Types ──────────────────────────────────────────────────────────────── */

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
  created_at: string
}

/* ── Role badge variant map ─────────────────────────────────────────────── */

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

/* ── Avatar helpers ─────────────────────────────────────────────────────── */

const AVATAR_PALETTE = [
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
]

function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function initialsFor(admin: Admin): string {
  if (admin.full_name?.trim()) {
    return admin.full_name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return admin.email.slice(0, 2).toUpperCase()
}

function relativeLogin(admin: Admin): string {
  if (!admin.last_login_at) return 'Never'
  try {
    return formatDistanceToNow(new Date(admin.last_login_at), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

/* ── Input / label class constants ─────────────────────────────────────── */

const INPUT_CLS =
  'w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'

const LABEL_CLS = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'

/* ── Add Admin Drawer ───────────────────────────────────────────────────── */

interface AddAdminDrawerProps {
  open: boolean
  onClose: () => void
  roles: Role[]
  onSubmit: (data: { email: string; full_name: string; password: string; role_id: number | null }) => void
  isPending: boolean
}

function AddAdminDrawer({ open, onClose, roles, onSubmit, isPending }: AddAdminDrawerProps) {
  const [showPassword, setShowPassword] = useState(false)

  if (!open) return null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit({
      email: (fd.get('email') as string).trim(),
      full_name: ((fd.get('full_name') as string) || '').trim(),
      password: fd.get('password') as string,
      role_id: fd.get('role_id') ? Number(fd.get('role_id')) : null,
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md animate-slide-in-right">
        <div className="flex h-full flex-col bg-card border-l border-border shadow-2xl">
          {/* Gradient accent bar */}
          <div className="h-[3px] w-full uzum-gradient shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg uzum-gradient">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  Add Administrator
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  New admin account with role assignment
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form body */}
          <form
            id="add-admin-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          >
            {/* Email */}
            <div>
              <label htmlFor="af-email" className={LABEL_CLS}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="af-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="admin@example.com"
                  className={cn(INPUT_CLS, 'pl-10')}
                />
              </div>
            </div>

            {/* Full name */}
            <div>
              <label htmlFor="af-fullname" className={LABEL_CLS}>
                Full Name <span className="normal-case font-normal opacity-60">(optional)</span>
              </label>
              <div className="relative">
                <UserCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="af-fullname"
                  name="full_name"
                  type="text"
                  autoComplete="off"
                  placeholder="Jane Doe"
                  className={cn(INPUT_CLS, 'pl-10')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="af-password" className={LABEL_CLS}>
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="af-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Strong password"
                  className={cn(INPUT_CLS, 'pl-10 pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="af-role" className={LABEL_CLS}>
                Role Assignment
              </label>
              <select
                id="af-role"
                name="role_id"
                className={INPUT_CLS}
              >
                <option value="">No role assigned</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Roles control which parts of the admin panel are accessible.
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-admin-form"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

/* ── Delete Confirm Dialog ──────────────────────────────────────────────── */

interface ConfirmDialogProps {
  open: boolean
  admin: Admin | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

function ConfirmDialog({ open, admin, onClose, onConfirm, isPending }: ConfirmDialogProps) {
  if (!open || !admin) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 animate-scale-in">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>

          <h3 className="text-base font-semibold text-foreground text-center">
            Remove Administrator
          </h3>
          <p className="mt-2 text-sm text-muted-foreground text-center leading-relaxed">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-foreground">{admin.email}</span>?
            {' '}This action cannot be undone.
          </p>

          <div className="flex items-center gap-2.5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 transition-colors"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Loading skeleton ───────────────────────────────────────────────────── */

function AdminSkeleton() {
  return (
    <DataCard padding="none" className="overflow-hidden">
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-3.5 w-36 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-52 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </DataCard>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function AdminsPage() {
  const qc = useQueryClient()
  const { getView, setView, density, setDensity } = useViewPreferences()
  const view = getView('admins', 'table')
  const dc = densityClasses[density]

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)

  /* ── Queries ── */

  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => getAdmins().then((r) => r.data),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles().then((r) => r.data),
  })

  /* ── Mutations ── */

  const createMut = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      toast.success('Administrator created successfully')
      setDrawerOpen(false)
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? 'Failed to create administrator'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      toast.success('Administrator removed')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: () => toast.error('Failed to remove administrator'),
  })

  const admins: Admin[] = adminsData?.admins ?? []
  const roles: Role[] = rolesData?.roles ?? []

  /* ── Table View ── */

  function renderTable() {
    return (
      <DataCard padding="none" className="overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className={cn('w-full min-w-[720px]', dc.text)}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Administrator', 'Email', 'Role', 'TOTP', 'Status', 'Last Login', ''].map((h, idx) => (
                  <th
                    key={`${h}-${idx}`}
                    className={cn(
                      'text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider',
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
                <tr key={a.id} className="hover:bg-muted/30 transition-colors group">
                  {/* Name + avatar */}
                  <td className={cn(dc.padding)}>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-full font-semibold shrink-0 select-none',
                          avatarColor(a.id),
                          density === 'compact' ? 'w-6 h-6 text-[10px]' : 'w-9 h-9 text-xs',
                        )}
                      >
                        {initialsFor(a)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate leading-tight">
                          {a.full_name || a.email.split('@')[0]}
                        </p>
                        {a.is_superadmin && (
                          <p className="text-[10px] uzum-gradient-text font-semibold mt-0.5">
                            Superadmin
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className={cn(dc.padding, 'text-muted-foreground font-mono text-xs')}>
                    {a.email}
                  </td>

                  {/* Role badge */}
                  <td className={cn(dc.padding)}>
                    <StatusBadge variant={roleBadgeVariant(a.role?.name)}>
                      {a.role?.name ?? 'No role'}
                    </StatusBadge>
                  </td>

                  {/* TOTP */}
                  <td className={cn(dc.padding)}>
                    {a.is_totp_enabled ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">On</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground/50 text-xs">
                        <ShieldOff className="w-4 h-4" />
                        <span className="hidden sm:inline">Off</span>
                      </span>
                    )}
                  </td>

                  {/* Active status */}
                  <td className={cn(dc.padding)}>
                    <StatusBadge variant={a.is_active ? 'success' : 'neutral'} dot>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>

                  {/* Last login */}
                  <td className={cn(dc.padding, 'text-muted-foreground text-xs whitespace-nowrap')}>
                    {relativeLogin(a)}
                  </td>

                  {/* Actions */}
                  <td className={cn(dc.padding)}>
                    {!a.is_superadmin && (
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove administrator"
                        aria-label={`Remove ${a.email}`}
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

  /* ── Card View ── */

  function renderCards() {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 animate-fade-in', dc.gap)}>
        {admins.map((a) => (
          <DataCard key={a.id} className="group hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-full font-semibold text-sm shrink-0 select-none',
                    avatarColor(a.id),
                  )}
                >
                  {initialsFor(a)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate leading-tight">
                    {a.full_name || a.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{a.email}</p>
                </div>
              </div>
              {/* TOTP shield */}
              {a.is_totp_enabled ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <ShieldOff className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
            </div>

            {/* Badges */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge variant={roleBadgeVariant(a.role?.name)}>
                {a.role?.name ?? 'No role'}
              </StatusBadge>
              <StatusBadge variant={a.is_active ? 'success' : 'neutral'} dot>
                {a.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
              {a.is_superadmin && (
                <StatusBadge variant="primary">Superadmin</StatusBadge>
              )}
            </div>

            {/* Footer */}
            <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Last login: <span className="text-foreground/70">{relativeLogin(a)}</span>
              </p>
              {!a.is_superadmin && (
                <button
                  onClick={() => setDeleteTarget(a)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove administrator"
                  aria-label={`Remove ${a.email}`}
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

  /* ── Render ── */

  return (
    <div className={cn('space-y-5', dc.spacing)}>
      <PageHeader
        title="Administrators"
        description="Manage admin accounts and roles"
        icon={<ShieldCheck className="w-5 h-5 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <DensityToggle current={density} onChange={setDensity} />
            <ViewToggle
              current={view}
              onChange={(m) => setView('admins', m)}
              options={['table', 'card']}
            />
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </button>
          </div>
        }
      />

      {isLoading ? (
        <AdminSkeleton />
      ) : admins.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-7 h-7 text-muted-foreground/60" />}
          title="No administrators yet"
          description="Create your first administrator account to get started managing the platform."
          action={
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
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
