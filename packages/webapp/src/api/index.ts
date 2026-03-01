import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({ baseURL: BASE })

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('webapp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401 — clear stored token but do NOT reload
// (reload would cause an infinite loop if Telegram auth itself returns 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear direct localStorage key
      localStorage.removeItem('webapp_token')
      localStorage.removeItem('webapp_user')
      // Also null out the zustand persist store so useTelegramAuth re-runs auth
      try {
        const raw = localStorage.getItem('uzumbot-webapp-auth')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.state) {
            parsed.state.token = null
            parsed.state.user = null
            localStorage.setItem('uzumbot-webapp-auth', JSON.stringify(parsed))
          }
        }
      } catch {}
    }
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authWithTelegram = (initData: string) =>
  api.post('/auth/telegram', { init_data: initData })

export const authWithTelegramWidget = (data: Record<string, string | number>) =>
  api.post('/auth/telegram-login', data)

// ── Spins ─────────────────────────────────────────────────────────────────────
export const getSpinCommitments = () => api.get('/spins/commitments')
export const commitSpin = () =>
  api.post('/spins/commit')
export const executeSpin = (commitment_id: string) =>
  api.post('/spins/execute', { commitment_id })
export const getPrizeOdds = () => api.get('/spins/prizes')
export const getSpinHistory = () => api.get('/spins/history')

// ── Rewards / Wallet ──────────────────────────────────────────────────────────
export const getMyRewards = () => api.get('/rewards')
export const donateReward = (rewardId: string, campaignId?: string) =>
  api.post(`/rewards/${rewardId}/donate`, campaignId ? { campaign_id: campaignId } : {})

// ── Charity ───────────────────────────────────────────────────────────────────
export const getPublicCampaigns = () => api.get('/charity/campaigns')
export const donateToCampaign = (campaign_id: string, amount: number) =>
  api.post('/charity/donate', { campaign_id, amount })
/** @deprecated Use donateToCampaign instead */
export const donateToCapmaign = donateToCampaign
export const giveSadaqa = (amount: number) =>
  api.post('/charity/donate', { amount })
export const getCharityLeaderboard = () => api.get('/charity/leaderboard')

// ── User profile ──────────────────────────────────────────────────────────────
export const getMe = () => api.get('/me')
export const getReferralStats = () => api.get('/me/referral')

// ── Submissions (My Reviews) ──────────────────────────────────────────────────
export const getMySubmissions = (page = 1, limit = 20) =>
  api.get('/submissions', { params: { page, limit } })

// ── Products (public) ─────────────────────────────────────────────────────────
export const getProducts = (search?: string, page = 1, page_size = 50) =>
  api.get('/products', { params: { search, page, page_size } })
