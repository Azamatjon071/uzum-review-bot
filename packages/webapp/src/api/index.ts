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
export const getSpinCommitments = () => api.get('/spins/my')
export const commitSpin = (submission_id: number) =>
  api.post('/spins/commit', { submission_id })
export const executeSpin = (commitment_id: string) =>
  api.post('/spins/spin', { commitment_id })
export const getPrizeOdds = () => api.get('/spins/odds')

// ── Rewards / Wallet ──────────────────────────────────────────────────────────
export const getMyRewards = () => api.get('/spins/rewards')

// ── Charity ───────────────────────────────────────────────────────────────────
export const getPublicCampaigns = () => api.get('/charity/campaigns')
export const donateToCapmaign = (campaign_id: string, amount: number) =>
  api.post('/charity/donate', { campaign_id, amount })
export const giveSadaqa = (amount: number) =>
  api.post('/charity/sadaqa', { amount })
export const getCharityLeaderboard = () => api.get('/charity/leaderboard')

// ── User profile ──────────────────────────────────────────────────────────────
export const getMe = () => api.get('/users/me')
