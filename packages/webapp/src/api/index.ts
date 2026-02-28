import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({ baseURL: BASE })

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('webapp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authWithTelegram = (initData: string) =>
  api.post('/auth/telegram', { init_data: initData })

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
export const donateToCapmaign = (campaign_id: string, amount: number) =>
  api.post('/charity/donate', { campaign_id, amount })
export const donateToCampaign = donateToCapmaign
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
