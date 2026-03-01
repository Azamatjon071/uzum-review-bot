import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/api'
import { Package, Plus, X, ExternalLink, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import FilterBar from '@/components/ui/FilterBar'
import ViewToggle from '@/components/ui/ViewToggle'
import DensityToggle from '@/components/ui/DensityToggle'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import type { ViewMode } from '@/hooks/useViewPreferences'

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name_uz: string
  name_ru: string
  name_en: string
  uzum_product_url?: string | null
  image_url?: string | null
  is_active: boolean
  created_at?: string
}

interface ProductsResponse {
  items: Product[]
  total: number
  page: number
  page_size: number
}

// ── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange() }}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50',
        checked ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  )
}

// ── Delete confirmation dialog ───────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 animate-fade-in" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">{message}</p>
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Product form drawer ──────────────────────────────────────────────────────

function ProductFormDrawer({
  editing,
  onClose,
  onCreate,
  onUpdate,
  isPending,
}: {
  editing: Product | null
  onClose: () => void
  onCreate: (data: Record<string, unknown>) => void
  onUpdate: (data: { id: string; data: Record<string, unknown> }) => void
  isPending: boolean
}) {
  const [isActive, setIsActive] = useState(editing?.is_active ?? true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name_uz: (fd.get('name_uz') as string) || '',
      name_ru: (fd.get('name_ru') as string) || '',
      name_en: (fd.get('name_en') as string) || '',
      uzum_product_url: (fd.get('uzum_product_url') as string) || null,
      image_url: (fd.get('image_url') as string) || null,
      is_active: isActive,
    }
    if (editing) {
      onUpdate({ id: editing.id, data: payload })
    } else {
      onCreate(payload)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header with accent */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-1 uzum-gradient" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                {editing ? 'Edit Product' : 'New Product'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {[
            { name: 'name_uz', label: 'Name (UZ)', placeholder: 'Mahsulot nomi', defaultKey: 'name_uz' as const },
            { name: 'name_ru', label: 'Name (RU)', placeholder: 'Название товара', defaultKey: 'name_ru' as const },
            { name: 'name_en', label: 'Name (EN)', placeholder: 'Product name', defaultKey: 'name_en' as const },
          ].map(({ name, label, placeholder, defaultKey }) => (
            <div key={name}>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
              <input
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[defaultKey] ?? ''}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Uzum Product URL</label>
            <input
              name="uzum_product_url"
              type="url"
              placeholder="https://uzum.uz/product/..."
              defaultValue={editing?.uzum_product_url ?? ''}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Image URL</label>
            <input
              name="image_url"
              type="url"
              placeholder="https://..."
              defaultValue={editing?.image_url ?? ''}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/50 px-4 py-3">
            <label className="text-xs font-medium text-muted-foreground">Active</label>
            <ToggleSwitch checked={isActive} onChange={() => setIsActive(!isActive)} />
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { getView, setView, density, setDensity } = useViewPreferences()
  const view = getView('products', 'table') as ViewMode
  const dc = densityClasses[density]

  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ['products', page, search],
    queryFn: () =>
      getProducts({ page, per_page: pageSize, search: search || undefined }).then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success('Product created')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to create product'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateProduct(id, data),
    onSuccess: () => {
      toast.success('Product updated')
      setEditing(null)
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to update product'),
  })

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateProduct(id, { is_active }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to delete product'),
  })

  const products = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const filtered = products.filter((p) => {
    if (activeFilter === 'active') return p.is_active
    if (activeFilter === 'inactive') return !p.is_active
    return true
  })

  const filterChips = [
    { key: 'all', label: 'All', active: activeFilter === 'all' },
    { key: 'active', label: 'Active', active: activeFilter === 'active' },
    { key: 'inactive', label: 'Inactive', active: activeFilter === 'inactive' },
  ]

  function openEdit(p: Product) {
    setEditing(p)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  return (
    <div className={dc.spacing}>
      <PageHeader
        title="Products"
        description="Manage products available for user submissions"
        icon={<Package className="w-5 h-5 text-primary" />}
        badge={<StatusBadge variant="info" size="sm">{total} total</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <DensityToggle current={density} onChange={setDensity} />
            <ViewToggle
              current={view}
              onChange={(m) => setView('products', m)}
              options={['table', 'card']}
            />
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search products..."
        chips={filterChips}
        onChipToggle={(key) => setActiveFilter(key as 'all' | 'active' | 'inactive')}
      />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6 text-muted-foreground/60" />}
          title={search ? 'No products match your search' : 'No products yet'}
          description={search ? 'Try a different search term' : 'Add your first product to get started'}
          action={
            !search ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            ) : undefined
          }
        />
      ) : view === 'table' ? (
        /* ── Table View ── */
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className={cn('w-full', dc.text)}>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Name (UZ)', 'Name (RU)', 'Name (EN)', 'URL', 'Active', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        dc.padding,
                        'text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                    <td className={cn(dc.padding, dc.text)}>
                      <div className="flex items-center gap-2.5">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {(p.name_uz?.[0] ?? '?').toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-foreground truncate max-w-[200px] group-hover:text-primary transition-colors">
                          {p.name_uz}
                        </span>
                      </div>
                    </td>
                    <td className={cn(dc.padding, dc.text, 'text-muted-foreground truncate max-w-[180px]')}>
                      {p.name_ru}
                    </td>
                    <td className={cn(dc.padding, dc.text, 'text-muted-foreground truncate max-w-[180px]')}>
                      {p.name_en}
                    </td>
                    <td className={dc.padding}>
                      {p.uzum_product_url ? (
                        <a
                          href={p.uzum_product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className={dc.padding}>
                      <StatusBadge variant={p.is_active ? 'success' : 'neutral'} dot size="sm">
                        {p.is_active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </td>
                    <td className={dc.padding}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleActiveMut.mutate({ id: p.id, is_active: !p.is_active })}
                          className={cn(
                            'px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                            p.is_active
                              ? 'text-muted-foreground hover:bg-muted'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
                          )}
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Card View ── */
        <div className={cn('grid gap-3', dc.gridCols)}>
          {filtered.map((p) => (
            <DataCard key={p.id} padding="none">
              <div className="p-4 space-y-3">
                {/* Image / placeholder */}
                <div className="flex items-start gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name_uz}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.name_ru}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.name_en}</p>
                  </div>
                  <StatusBadge variant={p.is_active ? 'success' : 'neutral'} dot size="sm">
                    {p.is_active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </div>

                {/* Uzum link */}
                {p.uzum_product_url && (
                  <a
                    href={p.uzum_product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors truncate max-w-full"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p.uzum_product_url.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-border/50">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="inline-flex items-center justify-center p-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </DataCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {from}–{to} of {total.toLocaleString()}</span>
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

      {/* Product form drawer */}
      {showForm && (
        <ProductFormDrawer
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onCreate={(data) => createMut.mutate(data)}
          onUpdate={(data) => updateMut.mutate(data)}
          isPending={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteTarget.name_uz}"? This action cannot be undone.`}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMut.isPending}
        />
      )}
    </div>
  )
}
