import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({ baseURL: BASE })

// Track whether a token refresh is in-flight to avoid concurrent refreshes
let _refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem('admin_refresh_token')
  if (!refresh) return null
  try {
    const res = await axios.post(`${BASE}/auth/admin/refresh`, { refresh_token: refresh })
    const newToken: string = res.data.access_token
    localStorage.setItem('admin_token', newToken)
    if (res.data.refresh_token) {
      localStorage.setItem('admin_refresh_token', res.data.refresh_token)
    }
    return newToken
  } catch {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_refresh_token')
    return null
  }
}

// Attach stored admin JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Silent refresh on 401, then retry once; redirect to /login only if refresh fails
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Only intercept 401s that haven't been retried yet and are not the refresh call itself
    if (
      err.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/admin/refresh') &&
      !original.url?.includes('/auth/admin/login') &&
      !original.url?.includes('/auth/admin/2fa')
    ) {
      original._retry = true

      // Deduplicate: if a refresh is already in-flight, wait for it
      if (!_refreshPromise) {
        _refreshPromise = tryRefreshToken().finally(() => { _refreshPromise = null })
      }

      const newToken = await _refreshPromise
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }

      // Refresh failed — redirect to login
      window.location.href = '/login'
      return Promise.reject(err)
    }

    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
  api.post('/auth/admin/login', { email, password })

export const adminVerify2FA = (temp_token: string, code: string) =>
  api.post('/auth/admin/2fa', { temp_token, code })

/** Initiate forced TOTP setup (step 1 — no code yet, returns QR). */
export const adminInitForcedSetup = (temp_token: string) =>
  api.post('/auth/admin/2fa/setup-forced', { temp_token, code: '' })

/** Confirm forced TOTP setup (step 2 — submit scanned code). */
export const adminConfirmForcedSetup = (temp_token: string, code: string) =>
  api.post('/auth/admin/2fa/setup-forced', { temp_token, code })

export const adminRefresh = (refresh_token: string) =>
  api.post('/auth/admin/refresh', { refresh_token })

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = (range = '30d') =>
  api.get(`/admin/analytics/overview?range=${range}`)
export const getAnalyticsChart = (days = 30) => api.get(`/admin/analytics/submissions?days=${days}`)
export const getAnalyticsCharity = () => api.get('/admin/analytics/charity')

// ── Advanced Analytics ────────────────────────────────────────────────────────
export const getRetentionData = (weeks = 8) =>
  api.get(`/admin/analytics/retention?weeks=${weeks}`)
export const getFunnelData = (range = '30d') =>
  api.get(`/admin/analytics/funnel?range=${range}`)
export const getPrizePopularity = (range = '30d') =>
  api.get(`/admin/analytics/prize-popularity?range=${range}`)
export const getHeatmapData = (range = '30d') =>
  api.get(`/admin/analytics/heatmap?range=${range}`)
export const getGeoData = (range = '30d') =>
  api.get(`/admin/analytics/geo?range=${range}`)

// ── Submissions ──────────────────────────────────────────────────────────────
export const getSubmissions = (params?: Record<string, unknown>) =>
  api.get('/admin/submissions', { params })
export const approveSubmission = (id: string) =>
  api.patch(`/admin/submissions/${id}/approve`)
export const rejectSubmission = (id: string, reason?: string) =>
  api.patch(`/admin/submissions/${id}/reject`, reason !== undefined ? { reason } : {})
export const deleteSubmission = (id: string) =>
  api.delete(`/admin/submissions/${id}`)
export const bulkApprove = (ids: string[]) =>
  api.post('/admin/submissions/bulk', { ids, action: 'approve' })
export const bulkReject = (ids: string[], reason?: string) =>
  api.post('/admin/submissions/bulk', { ids, action: 'reject', reason })

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = (params?: Record<string, unknown>) =>
  api.get('/admin/users', { params })
export const getUserDetail = (id: string) => api.get(`/admin/users/${id}`)
export const updateUser = (id: string, data: unknown) => api.patch(`/admin/users/${id}`, data)
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
export const updateAdmin = (id: string, data: unknown) => api.patch(`/admin/admins/${id}`, data)
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
  scheduled_at?: string,
) => {
  const form = new FormData()
  form.append('message', message)
  if (language) form.append('language', language)
  if (image) form.append('image', image)
  if (scheduled_at) form.append('scheduled_at', scheduled_at)
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

// ── Fraud Signals ─────────────────────────────────────────────────────────────
export const getFraudStats = () =>
  api.get('/admin/fraud/stats')
export const getFraudSignals = (params?: Record<string, unknown>) =>
  api.get('/admin/fraud/signals', { params })
export const dismissFraudSignal = (id: string, reason?: string) =>
  api.post(`/admin/fraud/signals/${id}/dismiss`, { reason })
