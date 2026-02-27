import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({ baseURL: BASE })

// Attach stored admin JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
  api.post('/auth/admin/login', { email, password })

export const adminVerify2FA = (temp_token: string, totp_code: string) =>
  api.post('/auth/admin/2fa', { temp_token, totp_code })

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = () => api.get('/admin/analytics/overview')
export const getAnalyticsChart = (days = 30) => api.get(`/admin/analytics/submissions?days=${days}`)
export const getAnalyticsCharity = () => api.get('/admin/analytics/charity')

// ── Submissions ──────────────────────────────────────────────────────────────
export const getSubmissions = (params?: Record<string, unknown>) =>
  api.get('/admin/submissions', { params })
export const approveSubmission = (id: string) =>
  api.patch(`/admin/submissions/${id}/approve`)
export const rejectSubmission = (id: string, reason?: string) =>
  api.patch(`/admin/submissions/${id}/reject`, { reason })
export const bulkApprove = (ids: string[]) =>
  api.post('/admin/submissions/bulk', { ids, action: 'approve' })
export const bulkReject = (ids: string[], reason?: string) =>
  api.post('/admin/submissions/bulk', { ids, action: 'reject', reason })

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = (params?: Record<string, unknown>) =>
  api.get('/admin/users', { params })
export const getUserDetail = (id: string) => api.get(`/admin/users/${id}`)
export const banUser = (id: string, reason?: string) =>
  api.patch(`/admin/users/${id}/ban`, { reason })
export const unbanUser = (id: string) => api.patch(`/admin/users/${id}/unban`)
export const rewardUser = (id: string, data: unknown) => api.post(`/admin/users/${id}/reward`, data)

// ── Prizes ─────────────────────────────────────────────────────────────────────
export const getPrizes = () => api.get('/admin/prizes')
export const createPrize = (data: unknown) => api.post('/admin/prizes', data)
export const updatePrize = (id: string, data: unknown) => api.put(`/admin/prizes/${id}`, data)
export const deletePrize = (id: string) => api.delete(`/admin/prizes/${id}`)
export const togglePrize = (id: string) => api.patch(`/admin/prizes/${id}/toggle`)

// ── Charity ───────────────────────────────────────────────────────────────────
export const getCharityCampaigns = (params?: Record<string, unknown>) =>
  api.get('/admin/charity/campaigns', { params })
export const createCampaign = (data: unknown) => api.post('/admin/charity/campaigns', data)
export const updateCampaign = (id: string, data: unknown) =>
  api.put(`/admin/charity/campaigns/${id}`, data)
export const closeCampaign = (id: string) =>
  api.patch(`/admin/charity/campaigns/${id}/close`)
export const getCampaignDonations = (_id: string) =>
  api.get('/admin/charity/donations', { params: { campaign_id: _id } })

// ── Audit ─────────────────────────────────────────────────────────────────────
export const getAuditLogs = (params?: Record<string, unknown>) =>
  api.get('/admin/audit-log', { params })

// ── Admin users ───────────────────────────────────────────────────────────────
export const getAdmins = () => api.get('/admin/admins')
export const createAdmin = (data: unknown) => api.post('/admin/admins', data)
export const deleteAdmin = (id: string) => api.delete(`/admin/admins/${id}`)
export const getRoles = () => api.get('/admin/admins/roles')
export const createRole = (data: unknown) => api.post('/admin/admins/roles', data)

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings = () => api.get('/admin/settings')
export const updateSettings = (data: unknown) => api.patch('/admin/settings', data)

// ── Broadcast ─────────────────────────────────────────────────────────────────
export const sendBroadcast = (
  message: string,
  language?: string,
  image?: File | null,
) => {
  const form = new FormData()
  form.append('message', message)
  if (language) form.append('language', language)
  if (image) form.append('image', image)
  return api.post('/admin/broadcast', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params?: Record<string, unknown>) =>
  api.get('/admin/products', { params })
export const createProduct = (data: unknown) => api.post('/admin/products', data)
export const updateProduct = (id: string, data: unknown) =>
  api.patch(`/admin/products/${id}`, data)
export const deleteProduct = (id: string) => api.delete(`/admin/products/${id}`)

// ── Reports ───────────────────────────────────────────────────────────────────
export const downloadExport = (export_type: string) =>
  api.post('/admin/reports/export', { export_type }, { responseType: 'blob' })
