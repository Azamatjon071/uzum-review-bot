import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/api'

export default function ProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data } = useQuery({
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

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to delete product'),
  })

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
    editing
      ? updateMut.mutate({ id: editing.id, data: payload })
      : createMut.mutate(payload)
  }

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Form */}
      {(showForm || editing) && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold mb-4">{editing ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {[
              { name: 'name_uz', placeholder: 'Name (UZ)' },
              { name: 'name_ru', placeholder: 'Name (RU)' },
              { name: 'name_en', placeholder: 'Name (EN)' },
              { name: 'category', placeholder: 'Category (optional)' },
            ].map(({ name, placeholder }) => (
              <input
                key={name}
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[name]}
                className="border rounded-lg px-3 py-2 text-sm"
                required={!['category'].includes(name)}
              />
            ))}
            <input
              name="uzum_product_id"
              placeholder="Uzum Product ID (optional)"
              defaultValue={editing?.uzum_product_id}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              name="uzum_url"
              type="url"
              placeholder="Uzum URL (optional)"
              defaultValue={editing?.uzum_url}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {['ID', 'Name (UZ)', 'Category', 'Uzum ID', 'Submissions', 'Active', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400">{p.id}</td>
                <td className="px-4 py-3 font-medium max-w-xs truncate">{p.name_uz}</td>
                <td className="px-4 py-3 text-slate-500">{p.category ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                  {p.uzum_product_id ? (
                    p.uzum_url ? (
                      <a
                        href={p.uzum_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {p.uzum_product_id}
                      </a>
                    ) : (
                      p.uzum_product_id
                    )
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{p.submission_count ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {p.is_active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-3">
                  <button
                    onClick={() => { setEditing(p); setShowForm(false) }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.name_uz}"?`)) deleteMut.mutate(p.id)
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                  {search ? 'No products match your search.' : 'No products yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} products total</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
