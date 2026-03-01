import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/api'
import { Package, Plus, X, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
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
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50',
        checked ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-muted-foreground/30'
      )}
    >
      <span
        className={clsx(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
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
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-sm p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
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
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-lg z-50 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit Product' : 'New Product'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {[
            { name: 'name_uz', label: 'Name (UZ)', placeholder: 'Mahsulot nomi', defaultKey: 'name_uz' as const },
            { name: 'name_ru', label: 'Name (RU)', placeholder: 'Название товара', defaultKey: 'name_ru' as const },
            { name: 'name_en', label: 'Name (EN)', placeholder: 'Product name', defaultKey: 'name_en' as const },
          ].map(({ name, label, placeholder, defaultKey }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
              <input
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[defaultKey] ?? ''}
                required
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Uzum Product URL</label>
            <input
              name="uzum_product_url"
              type="url"
              placeholder="https://uzum.uz/product/..."
              defaultValue={editing?.uzum_product_url ?? ''}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Image URL</label>
            <input
              name="image_url"
              type="url"
              placeholder="https://..."
              defaultValue={editing?.image_url ?? ''}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Active</label>
            <ToggleSwitch checked={isActive} onChange={() => setIsActive(!isActive)} />
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Manage products available for user submissions"
        badge={
          <StatusBadge variant="neutral">{total} total</StatusBadge>
        }
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search products..."
        chips={filterChips}
        onChipToggle={(key) => setActiveFilter(key as 'all' | 'active' | 'inactive')}
      >
        <div className="flex items-center gap-2">
          <ViewToggle
            current={view}
            onChange={(m) => setView('products', m)}
            options={['table', 'card']}
          />
          <DensityToggle current={density} onChange={setDensity} />
        </div>
      </FilterBar>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={clsx('flex gap-4 border-b border-border last:border-b-0', dc.padding)}>
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6 text-muted-foreground" />}
          title={search ? 'No products match your search' : 'No products yet'}
          description={search ? 'Try a different search term' : 'Add your first product to get started'}
          action={
            !search ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            ) : undefined
          }
        />
      ) : view === 'table' ? (
        /* ── Table View ──────────────────────────────────────────────────── */
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Name (UZ)', 'Name (RU)', 'Name (EN)', 'URL', 'Active', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={clsx(
                        'text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                        dc.padding
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
                    <td className={clsx(dc.padding, dc.text)}>
                      <div className="flex items-center gap-2.5">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="w-8 h-8 rounded-md object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium shrink-0">
                            {(p.name_uz?.[0] ?? '?').toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {p.name_uz}
                        </span>
                      </div>
                    </td>
                    <td className={clsx(dc.padding, dc.text, 'text-muted-foreground truncate max-w-[180px]')}>
                      {p.name_ru}
                    </td>
                    <td className={clsx(dc.padding, dc.text, 'text-muted-foreground truncate max-w-[180px]')}>
                      {p.name_en}
                    </td>
                    <td className={clsx(dc.padding)}>
                      {p.uzum_product_url ? (
                        <a
                          href={p.uzum_product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">--</span>
                      )}
                    </td>
                    <td className={clsx(dc.padding)}>
                      <StatusBadge variant={p.is_active ? 'success' : 'neutral'} dot>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </td>
                    <td className={clsx(dc.padding)}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleActiveMut.mutate({ id: p.id, is_active: !p.is_active })}
                          className={clsx(
                            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                            p.is_active
                              ? 'text-muted-foreground hover:bg-muted'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                          )}
                        >
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
        /* ── Card View ───────────────────────────────────────────────────── */
        <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', dc.gap)}>
          {filtered.map((p) => (
            <DataCard key={p.id} padding="none">
              <div className="p-4 space-y-3">
                {/* Image / placeholder */}
                <div className="flex items-start gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-10 h-10 rounded-md object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name_uz}</p>
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
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline truncate max-w-full"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p.uzum_product_url.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="inline-flex items-center justify-center p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total.toLocaleString()} product{total !== 1 ? 's' : ''} total
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
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
