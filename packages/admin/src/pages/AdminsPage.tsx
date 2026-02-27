import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAdmins, createAdmin, deleteAdmin, getRoles, createRole } from '@/api'

export default function AdminsPage() {
  const qc = useQueryClient()
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'admins' | 'roles'>('admins')

  const { data: adminsData } = useQuery({
    queryKey: ['admins'],
    queryFn: () => getAdmins().then((r) => r.data),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles().then((r) => r.data),
  })

  const createAdminMut = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      toast.success('Admin created')
      setShowAdminForm(false)
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? 'Failed to create admin'),
  })

  const deleteAdminMut = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      toast.success('Admin removed')
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: () => toast.error('Failed to remove admin'),
  })

  const createRoleMut = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      toast.success('Role created')
      setShowRoleForm(false)
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: () => toast.error('Failed to create role'),
  })

  function handleAdminSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    createAdminMut.mutate({
      username: fd.get('username'),
      password: fd.get('password'),
      role_id: fd.get('role_id') ? Number(fd.get('role_id')) : null,
    })
  }

  function handleRoleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const permStr = (fd.get('permissions') as string) ?? ''
    createRoleMut.mutate({
      name: fd.get('name'),
      permissions: permStr.split(',').map((p) => p.trim()).filter(Boolean),
    })
  }

  const admins = adminsData?.admins ?? []
  const roles = rolesData?.roles ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admins</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['admins', 'roles'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Admins tab */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdminForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              + Add Admin
            </button>
          </div>

          {showAdminForm && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="font-semibold mb-4">New Admin</h2>
              <form onSubmit={handleAdminSubmit} className="grid grid-cols-2 gap-4">
                <input
                  name="username"
                  placeholder="Username"
                  className="border rounded-lg px-3 py-2 text-sm"
                  required
                  autoComplete="off"
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="border rounded-lg px-3 py-2 text-sm"
                  required
                  autoComplete="new-password"
                />
                <select name="role_id" className="border rounded-lg px-3 py-2 text-sm col-span-2">
                  <option value="">No role</option>
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <div className="col-span-2 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAdminForm(false)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAdminMut.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {createAdminMut.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['ID', 'Username', 'Role', '2FA', 'Active', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{a.id}</td>
                    <td className="px-4 py-3 font-medium">{a.username}</td>
                    <td className="px-4 py-3 text-slate-500">{a.role?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.totp_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {a.totp_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {a.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {!a.is_superadmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove admin "${a.username}"?`)) {
                              deleteAdminMut.mutate(a.id)
                            }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No admins found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowRoleForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              + Add Role
            </button>
          </div>

          {showRoleForm && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="font-semibold mb-4">New Role</h2>
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <input
                  name="name"
                  placeholder="Role name (e.g. moderator)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Permissions (comma-separated, e.g. submissions:read, submissions:write)
                  </label>
                  <input
                    name="permissions"
                    placeholder="submissions:read, users:read"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRoleForm(false)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRoleMut.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {createRoleMut.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {roles.map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl border shadow-sm px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(r.permissions ?? []).map((p: string) => (
                        <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {p}
                        </span>
                      ))}
                      {(!r.permissions || r.permissions.length === 0) && (
                        <span className="text-xs text-slate-400">No permissions</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{r.admin_count ?? 0} admin(s)</span>
                </div>
              </div>
            ))}
            {roles.length === 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-slate-400 text-sm">
                No roles defined yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
