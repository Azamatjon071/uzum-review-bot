import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/api'
import { Package, Plus, X, Upload, ExternalLink, Search, ToggleLeft, ToggleRight, FileText } from 'lucide-react'

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
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
  editing: any
  onClose: () => void
  onCreate: (data: any) => void
  onUpdate: (data: any) => void
  isPending: boolean
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name_uz: fd.get('name_uz'),
      name_ru: fd.get('name_ru'),
      name_en: fd.get('name_en'),
      uzum_product_id: fd.get('uzum_product_id') || null,
      uzum_url: fd.get('uzum_url') || null,
      category: fd.get('category') || null,
      is_active: true,
    }
    editing ? onUpdate({ id: editing.id, data: payload }) : onCreate(payload)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Product' : 'New Product'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {[
            { name: 'name_uz', label: 'Name (Uzbek)', placeholder: 'Mahsulot nomi', required: true },
            { name: 'name_ru', label: 'Name (Russian)', placeholder: 'Название продукта', required: true },
            { name: 'name_en', label: 'Name (English)', placeholder: 'Product name', required: true },
            { name: 'category', label: 'Category', placeholder: 'Electronics, Clothing…', required: false },
          ].map(({ name, label, placeholder, required }) => (
            <div key={name}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <input
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[name]}
                required={required}
                className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Uzum Product ID</label>
            <input
              name="uzum_product_id"
              placeholder="e.g. 12345678"
              defaultValue={editing?.uzum_product_id}
              className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Uzum Product URL</label>
            <input
              name="uzum_url"
              type="url"
              placeholder="https://uzum.uz/product/..."
              defaultValue={editing?.uzum_url}
              className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-slate-400 mt-1">Users will be directed to this URL when submitting reviews</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── CSV Import Modal ─────────────────────────────────────────────────────────

function CSVImportModal({ onClose }: { onClose: () => void }) {
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<string[][]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      const rows = text.split('\n').slice(0, 6).map((r) => r.split(','))
      setPreview(rows)
    }
    reader.readAsText(file)
  }

  const handlePaste = (text: string) => {
    setCsvText(text)
    const rows = text.split('\n').slice(0, 6).map((r) => r.split(','))
    setPreview(rows)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto">
          <div className="flex items-center justify-between p-5 border-b">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <FileText size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Bulk Import Products</h3>
                <p className="text-xs text-slate-400">CSV format: name_uz, name_ru, name_en, category, uzum_id, uzum_url</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Upload area */}
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
            >
              <Upload size={24} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Drop CSV file here or click to browse</p>
              <p className="text-xs text-slate-400">Supports .csv files up to 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

            {/* Or paste */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Or paste CSV content</label>
              <textarea
                rows={4}
                placeholder="name_uz,name_ru,name_en,category,uzum_id,uzum_url&#10;Mahsulot,Продукт,Product,Electronics,12345,https://..."
                value={csvText}
                onChange={(e) => handlePaste(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview (first 5 rows)</p>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-slate-200 px-2 py-1.5 truncate max-w-32">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-5 pt-0 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium">
              Cancel
            </button>
            <button
              disabled={!csvText.trim()}
              onClick={() => { toast.info('CSV import is processed server-side — feature coming soon!'); onClose() }}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-md shadow-emerald-500/20"
            >
              Import {csvText.split('\n').filter(Boolean).length - 1} Products
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [showCSV, setShowCSV] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () =>
      getProducts({ page, per_page: 20, search: search || undefined }).then((r) => r.data),
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
    mutationFn: ({ id, data }: any) => updateProduct(id, data),
    onSuccess: () => {
      toast.success('Product updated')
      setEditing(null)
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
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to delete product'),
  })

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const activeCount = products.filter((p: any) => p.is_active).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {total} products · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCSV(true)}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Upload size={14} />
            Import CSV
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus size={15} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border rounded-xl pl-8 pr-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
        </div>
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['#', 'Product', 'Category', 'Uzum ID', 'Submissions', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Package size={24} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">
                      {search ? 'No products match your search' : 'No products yet'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try a different search term' : 'Add your first product to get started'}
                    </p>
                  </td>
                </tr>
              ) : products.map((p: any, idx: number) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                    {(page - 1) * 20 + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Product initial avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm flex-shrink-0 border border-slate-200">
                        {(p.name_en?.[0] ?? p.name_uz?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{p.name_uz}</p>
                        <p className="text-xs text-slate-400">{p.name_en}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.category ? (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{p.category}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.uzum_product_id ? (
                      p.uzum_url ? (
                        <a
                          href={p.uzum_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-mono text-xs font-semibold"
                        >
                          {p.uzum_product_id}
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">{p.uzum_product_id}</span>
                      )
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-700">{p.submission_count ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={p.is_active}
                      onChange={() => toggleActiveMut.mutate({ id: p.id, is_active: !p.is_active })}
                      disabled={toggleActiveMut.isPending}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditing(p); setShowForm(true) }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${p.name_uz}"?`)) deleteMut.mutate(p.id) }}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="font-medium">{total.toLocaleString()} products total</span>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border rounded-xl disabled:opacity-40 hover:bg-slate-50 font-medium transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-sm">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border rounded-xl disabled:opacity-40 hover:bg-slate-50 font-medium transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Product form drawer */}
      {(showForm || editing) && (
        <ProductFormDrawer
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onCreate={createMut.mutate}
          onUpdate={updateMut.mutate}
          isPending={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* CSV import modal */}
      {showCSV && <CSVImportModal onClose={() => setShowCSV(false)} />}
    </div>
  )
}
