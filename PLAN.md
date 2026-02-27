# UzumBot — Project Plan & Changelog

> **Telegram Bot + Admin Panel + Telegram Mini App**
> Rewards platform for Uzum Market customers who submit honest product reviews.

---

## Project Overview

**UzumBot** rewards customers who bought a seller's products on Uzum Market (uzum.uz) for leaving honest reviews. The flow:

1. Customer buys a product → opens the bot → submits order proof + review screenshot
2. Admin reviews the submission in the admin panel → approves or rejects
3. On approval → customer gets a **free spin** on a prize wheel in the Mini App
4. Winner gets a bonus (discount, cashback, gift, charity donation on their behalf)
5. Everything is **halal**: no stakes, odds disclosed, prizes are halal, charity built-in

**Three components:**
- `backend/` — Python FastAPI REST API (async, PostgreSQL, Redis, MinIO)
- `bot/` — Telegram Bot (aiogram 3, webhook mode, UZ/RU/EN)
- `admin/` — React admin panel (shadcn/ui, full management, no raw DB needed)
- `webapp/` — Telegram Mini App (React, animated spinner, rewards, charity)

---

## Tech Stack

### Backend — `packages/backend/`
| Concern | Technology |
|---|---|
| Framework | **FastAPI** (async, OpenAPI auto-docs, fastest Python framework) |
| Server | **Uvicorn** + **Gunicorn** (multi-worker production) |
| Database | **PostgreSQL 16** |
| ORM | **SQLAlchemy 2.0** (async, declarative) |
| Migrations | **Alembic** |
| Cache | **Redis 7** |
| Job Queue | **Celery** + Redis broker |
| File Storage | **MinIO** (S3-compatible, boto3 client) |
| Auth | **python-jose** (JWT) + **pyotp** (TOTP 2FA) |
| Validation | **Pydantic v2** |
| Password | **passlib** + **bcrypt** |
| Image Processing | **Pillow** + **imagehash** (perceptual dedup) |
| HTTP Client | **httpx** (async) |
| Logging | **structlog** (structured JSON) |

### Telegram Bot — `packages/bot/`
| Concern | Technology |
|---|---|
| Framework | **aiogram 3** (async, FSM, middleware, i18n) |
| Mode | Webhook (production) / Polling (dev) |
| State | FSM storage via Redis |
| i18n | aiogram-i18n (UZ/RU/EN .ftl files) |

### Admin Panel — `packages/admin/`
| Concern | Technology |
|---|---|
| Framework | **React 19** + **Vite 5** |
| UI | **shadcn/ui** + **Tailwind CSS** |
| Tables | **TanStack Table v8** |
| Charts | **Recharts** + **Apache ECharts** |
| State | **TanStack Query v5** + **Zustand** |
| Forms | **React Hook Form** + **Zod** |
| Auth | JWT + TOTP 2FA |

### Telegram Mini App — `packages/webapp/`
| Concern | Technology |
|---|---|
| Framework | **React 19** + **Vite 5** |
| Telegram SDK | `@telegram-apps/sdk-react` |
| UI | `@telegram-apps/telegram-ui` + custom |
| Animation | **Framer Motion** (spinner, confetti) |
| Routing | **React Router v7** |
| State | **TanStack Query v5** + **Zustand** |

### Infrastructure
| Concern | Technology |
|---|---|
| Containers | Docker + Docker Compose |
| Reverse Proxy | **Caddy** (auto HTTPS, HTTP/2) |
| Monitoring | Prometheus + Grafana |
| Logging | structlog → stdout → Docker log driver |

---

## Database Schema

```sql
-- Core users (Telegram)
users
  id, telegram_id, username, first_name, last_name,
  language (uz/ru/en), is_banned, ban_reason,
  total_submissions, approved_submissions, total_spins,
  referral_code, referred_by_id,
  created_at, updated_at

-- Products seller manages
products
  id, name_uz, name_ru, name_en, uzum_product_url,
  image_url, is_active, created_at

-- Review submissions
submissions
  id, user_id, product_id,
  order_number (optional), review_text,
  status (pending/approved/rejected/duplicate),
  rejection_reason, reviewed_by_admin_id,
  reviewed_at, created_at

-- Images per submission
submission_images
  id, submission_id, file_key (MinIO), original_filename,
  perceptual_hash, file_size, created_at

-- Prize catalog
prizes
  id, name_uz, name_ru, name_en, description_uz, description_ru, description_en,
  type (discount/cashback/gift/free_product/charity_donation),
  value, value_currency (UZS/USD),
  icon_url, weight (probability), stock_limit, stock_used,
  is_active, created_at

-- Provably fair commitments
spin_commitments
  id, user_id, server_seed_hash, nonce,
  is_used, created_at

-- Spin results
prize_spins
  id, user_id, submission_id, prize_id,
  server_seed, server_seed_hash, nonce,
  raw_result, is_verified,
  created_at

-- Earned rewards
rewards
  id, user_id, spin_id, prize_id,
  status (pending/claimed/expired/donated),
  claim_code, claimed_at, expires_at,
  created_at

-- Charity campaigns
charity_campaigns
  id, name_uz, name_ru, name_en,
  description_uz, description_ru, description_en,
  image_url, goal_amount, raised_amount,
  is_active, deadline, created_at

-- Charity donations
charity_donations
  id, user_id, campaign_id (nullable = general sadaqa),
  amount_uzs, source (reward/direct),
  reward_id (nullable),
  created_at

-- Admin users
admin_users
  id, email, password_hash, full_name,
  role_id, totp_secret, is_totp_enabled,
  is_active, last_login_at, last_login_ip,
  created_at

-- Admin roles + permissions
admin_roles
  id, name, permissions (JSONB)

-- Immutable audit log
audit_logs
  id, admin_id (nullable), user_id (nullable),
  action, resource_type, resource_id,
  ip_address, user_agent,
  before_data (JSONB), after_data (JSONB),
  created_at

-- Platform settings (key-value)
settings
  key (PK), value (JSONB), description, updated_by_admin_id, updated_at

-- Notifications queue
notifications
  id, user_id, type, payload (JSONB),
  is_sent, sent_at, error, created_at
```

---

## API Routes

### Auth
```
POST /api/v1/auth/telegram        # Validate initData → JWT
POST /api/v1/auth/admin/login     # Email + password
POST /api/v1/auth/admin/2fa       # TOTP verification
POST /api/v1/auth/admin/2fa/setup # Get QR code for TOTP setup
POST /api/v1/auth/refresh         # Refresh access token
POST /api/v1/auth/logout
```

### User (Mini App)
```
GET  /api/v1/me                   # Profile + stats
GET  /api/v1/me/submissions       # Submission history
GET  /api/v1/me/rewards           # Rewards wallet
GET  /api/v1/me/donations         # Charity history
```

### Submissions
```
POST /api/v1/submissions          # Create (multipart, images)
GET  /api/v1/submissions/:id      # Get own submission
```

### Prizes & Spins
```
GET  /api/v1/prizes               # List prizes + weights (for wheel display)
GET  /api/v1/spins/eligibility    # Check if user can spin
POST /api/v1/spins/commit         # Get provably fair hash commitment
POST /api/v1/spins/execute        # Execute spin → result + seed reveal
GET  /api/v1/spins/history        # User's spin history
POST /api/v1/spins/verify         # Verify a past spin result
```

### Rewards
```
POST /api/v1/rewards/:id/claim    # Claim a reward
POST /api/v1/rewards/:id/donate   # Donate reward to charity
```

### Charity
```
GET  /api/v1/charity/campaigns    # Active campaigns
POST /api/v1/charity/donate       # Direct sadaqa donation
GET  /api/v1/charity/leaderboard  # Top donors (opt-in)
```

### Referral
```
GET  /api/v1/referral/stats       # My referral stats
```

### Admin — Submissions
```
GET    /api/v1/admin/submissions              # Paginated + filtered
GET    /api/v1/admin/submissions/:id          # Detail + images
PATCH  /api/v1/admin/submissions/:id/approve
PATCH  /api/v1/admin/submissions/:id/reject
POST   /api/v1/admin/submissions/bulk         # Bulk actions
```

### Admin — Users
```
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id/ban
PATCH  /api/v1/admin/users/:id/unban
POST   /api/v1/admin/users/:id/reward         # Manual reward grant
```

### Admin — Prizes
```
GET    /api/v1/admin/prizes
POST   /api/v1/admin/prizes
PUT    /api/v1/admin/prizes/:id
DELETE /api/v1/admin/prizes/:id
PATCH  /api/v1/admin/prizes/:id/toggle
```

### Admin — Charity
```
GET    /api/v1/admin/charity/campaigns
POST   /api/v1/admin/charity/campaigns
PUT    /api/v1/admin/charity/campaigns/:id
PATCH  /api/v1/admin/charity/campaigns/:id/close
GET    /api/v1/admin/charity/donations
```

### Admin — Analytics
```
GET  /api/v1/admin/analytics/overview
GET  /api/v1/admin/analytics/submissions
GET  /api/v1/admin/analytics/spins
GET  /api/v1/admin/analytics/charity
GET  /api/v1/admin/analytics/users
```

### Admin — Platform
```
GET    /api/v1/admin/settings
PATCH  /api/v1/admin/settings
GET    /api/v1/admin/audit-log
POST   /api/v1/admin/broadcast
GET    /api/v1/admin/admin-users
POST   /api/v1/admin/admin-users
PATCH  /api/v1/admin/admin-users/:id
DELETE /api/v1/admin/admin-users/:id
GET    /api/v1/admin/reports/export          # CSV/XLSX download
```

---

## Security Architecture

```
Internet
  └─► Caddy (TLS 1.3, HSTS, rate limit)
        ├─► FastAPI backend (port 8000)
        ├─► Admin SPA  (port 80, /admin)
        └─► Mini App SPA (port 80, /app)

Telegram ──► Webhook (X-Telegram-Bot-Api-Secret-Token header verified)
Mini App ──► All requests carry JWT; initData HMAC verified server-side
Admin    ──► JWT + TOTP 2FA; IP allowlist optional; 30-min idle session
```

### Key Security Controls
| Threat | Control |
|---|---|
| Fake review images | Perceptual hash dedup + admin manual review |
| Multi-account abuse | Rate limit per telegram_id + duplicate image detection |
| Prize manipulation | Server-side CSPRNG (`secrets` module), provably fair |
| Admin takeover | Mandatory TOTP 2FA, bcrypt passwords, session timeout |
| API abuse | Sliding-window rate limiting in Redis per IP + user |
| File upload attacks | MIME type validation, 10MB size cap, Pillow re-encode |
| SQL injection | SQLAlchemy ORM parameterized queries only |
| XSS | React auto-escape, strict CSP header |
| Secrets | `.env` only, never committed, Docker secrets in prod |

---

## Project Structure

```
uzumbot/
├── PLAN.md                          ← This file
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── Makefile                         ← Dev shortcuts
│
├── packages/
│   │
│   ├── backend/                     ── FastAPI Python API
│   │   ├── app/
│   │   │   ├── main.py              ← FastAPI app factory
│   │   │   ├── config.py            ← Pydantic Settings
│   │   │   ├── database.py          ← Async SQLAlchemy engine
│   │   │   ├── deps.py              ← Dependency injection
│   │   │   ├── models/              ← SQLAlchemy ORM models
│   │   │   ├── schemas/             ← Pydantic request/response schemas
│   │   │   ├── routers/             ← FastAPI route handlers
│   │   │   │   ├── auth.py
│   │   │   │   ├── submissions.py
│   │   │   │   ├── spins.py
│   │   │   │   ├── rewards.py
│   │   │   │   ├── charity.py
│   │   │   │   └── admin/
│   │   │   │       ├── users.py
│   │   │   │       ├── submissions.py
│   │   │   │       ├── prizes.py
│   │   │   │       ├── charity.py
│   │   │   │       ├── analytics.py
│   │   │   │       ├── settings.py
│   │   │   │       ├── audit.py
│   │   │   │       └── admins.py
│   │   │   ├── services/
│   │   │   │   ├── auth.py
│   │   │   │   ├── storage.py       ← MinIO
│   │   │   │   ├── spin.py          ← CSPRNG + provably fair
│   │   │   │   ├── image.py         ← Pillow + perceptual hash
│   │   │   │   ├── charity.py
│   │   │   │   ├── notifications.py
│   │   │   │   └── audit.py
│   │   │   ├── tasks/               ← Celery tasks
│   │   │   │   ├── celery.py
│   │   │   │   ├── notifications.py
│   │   │   │   └── reports.py
│   │   │   ├── middleware/
│   │   │   │   ├── logging.py
│   │   │   │   └── telegram_auth.py
│   │   │   └── utils/
│   │   │       ├── security.py
│   │   │       └── pagination.py
│   │   ├── alembic/                 ← DB migrations
│   │   ├── tests/
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── bot/                         ── aiogram 3 Telegram Bot
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── handlers/
│   │   │   │   ├── start.py
│   │   │   │   ├── submission.py    ← FSM wizard
│   │   │   │   ├── status.py
│   │   │   │   ├── help.py
│   │   │   │   └── admin_notify.py
│   │   │   ├── keyboards/
│   │   │   │   ├── main.py
│   │   │   │   └── submission.py
│   │   │   ├── middleware/
│   │   │   │   ├── i18n.py
│   │   │   │   ├── throttling.py
│   │   │   │   └── user_sync.py
│   │   │   ├── states/
│   │   │   │   └── submission.py
│   │   │   └── api_client.py        ← httpx calls to backend
│   │   ├── locales/
│   │   │   ├── uz/
│   │   │   ├── ru/
│   │   │   └── en/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── admin/                       ── React Admin Panel
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── pages/
│   │   │   │   ├── auth/            ← Login, 2FA
│   │   │   │   ├── dashboard/
│   │   │   │   ├── submissions/     ← Queue + detail
│   │   │   │   ├── users/
│   │   │   │   ├── prizes/
│   │   │   │   ├── charity/
│   │   │   │   ├── analytics/
│   │   │   │   ├── broadcast/
│   │   │   │   ├── settings/
│   │   │   │   ├── admins/
│   │   │   │   └── audit-log/
│   │   │   ├── components/
│   │   │   │   ├── ui/              ← shadcn components
│   │   │   │   ├── layout/
│   │   │   │   ├── charts/
│   │   │   │   ├── tables/
│   │   │   │   └── forms/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── lib/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── Dockerfile
│   │
│   └── webapp/                      ── Telegram Mini App
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   ├── Spinner.tsx      ← Prize wheel
│       │   │   ├── Rewards.tsx
│       │   │   ├── Submissions.tsx
│       │   │   ├── Charity.tsx
│       │   │   ├── Leaderboard.tsx
│       │   │   └── Profile.tsx
│       │   ├── components/
│       │   │   ├── PrizeWheel/      ← Animated canvas wheel
│       │   │   ├── RewardCard/
│       │   │   ├── CharityCard/
│       │   │   ├── SubmissionCard/
│       │   │   └── Confetti/
│       │   ├── api/
│       │   ├── hooks/
│       │   ├── store/
│       │   └── lib/
│       ├── package.json
│       ├── vite.config.ts
│       └── Dockerfile
│
└── infra/
    ├── caddy/Caddyfile
    ├── prometheus/prometheus.yml
    └── grafana/dashboards/
```

---

## Changelog

### Phase 0 — Research & Planning ✅
- [x] Research Uzum Market platform, seller workflow, review system
- [x] Research Telegram Bot API, Mini Apps, initData security
- [x] Research halal finance, sadaqa/charity digital implementation
- [x] Research provably fair prize mechanics, anti-cheat
- [x] Research admin panel best practices, RBAC, audit logs
- [x] Define full tech stack (Python FastAPI, PostgreSQL, Redis, aiogram 3)
- [x] Create this PLAN.md

### Phase 1 — Project Scaffold ✅
- [x] Monorepo structure created
- [x] docker-compose.yml (postgres, redis, minio, backend, bot, admin, webapp, caddy)
- [x] .env.example with all variables documented
- [x] Makefile for dev shortcuts
- [x] Caddyfile for HTTPS reverse proxy

### Phase 2 — Backend: Core ✅
- [x] FastAPI app factory with lifespan, CORS, middleware
- [x] Pydantic Settings config
- [x] Async SQLAlchemy engine + session factory
- [x] All SQLAlchemy models (users, submissions, prizes, spins, rewards, charity, admin, audit)
- [x] Alembic migration setup + initial migration

### Phase 3 — Backend: Auth ✅
- [x] Telegram initData HMAC-SHA256 validation
- [x] JWT access + refresh token logic
- [x] Admin login (email + bcrypt password)
- [x] TOTP 2FA (pyotp) setup + verification + QR code
- [x] Auth dependencies (get_current_user, get_current_admin, require_permission)

### Phase 4 — Backend: Services ✅
- [x] MinIO storage service (upload, presigned URL, delete)
- [x] Image service (Pillow validation, re-encode, perceptual hash)
- [x] Provably fair spin service (secrets.token_bytes, HMAC-SHA256 commitment)
- [x] Charity service (campaign management, donation logic)
- [x] Notification service (enqueue to Celery)
- [x] Audit log service (auto-log all admin actions)

### Phase 5 — Backend: All Routes ✅
- [x] Auth routes
- [x] User profile routes
- [x] Submission create + list routes
- [x] Prize + spin routes
- [x] Rewards routes
- [x] Charity routes
- [x] All admin routes (users, submissions, prizes, charity, analytics, settings, audit, admins)
- [x] Broadcast endpoint
- [x] Export (CSV) endpoint

### Phase 6 — Celery Workers ✅
- [x] Celery app setup (Redis broker)
- [x] Notification dispatch task (calls Telegram Bot API)
- [x] Report generation task (async CSV/XLSX export)

### Phase 7 — Telegram Bot ✅
- [x] aiogram 3 app + webhook setup
- [x] Redis FSM storage
- [x] /start command + language selection
- [x] Submission wizard (FSM: product → order proof → review screenshot → images → confirm)
- [x] Status check command
- [x] Notifications handler (receive from backend)
- [x] Deep-link to Mini App
- [x] UZ/RU/EN i18n
- [x] Throttling middleware
- [x] User sync middleware (sync Telegram profile to backend)

### Phase 8 — Admin Panel ✅
- [x] React + Vite + shadcn/ui + Tailwind scaffold
- [x] Layout: sidebar, header, breadcrumbs, dark/light mode
- [x] Login page + TOTP 2FA page
- [x] Dashboard: KPI cards, charts, live queue counter
- [x] Submissions page: table + image lightbox + approve/reject drawer + bulk actions
- [x] Users page: search, filter, ban, detail drawer, manual reward
- [x] Prizes page: CRUD table, weight visualizer, stock tracker
- [x] Spin Settings page: configure cooldown, budget caps
- [x] Charity page: campaign CRUD, donations table, progress bars
- [x] Analytics page: time-series charts (submissions, spins, charity, users)
- [x] Broadcast page: compose + preview + send
- [x] Settings page: all platform settings as forms
- [x] Admin Users page: invite, roles, revoke
- [x] Audit Log page: immutable, filterable, paginated
- [x] Reports page: date-range export (CSV/XLSX)

### Phase 9 — Telegram Mini App ✅
- [x] React + Vite + @telegram-apps/sdk-react scaffold
- [x] Theme sync (Telegram colors → CSS vars)
- [x] Bottom navigation bar
- [x] Home page: status summary, CTA, recent activity
- [x] Spinner page: animated canvas prize wheel, Framer Motion, haptic, confetti
- [x] Provably fair verify modal
- [x] Rewards page: wallet, claim button, donate to charity
- [x] Submissions page: history with status badges + image preview
- [x] Charity page: campaign cards with progress, donate modal
- [x] Leaderboard page: top reviewers + top donors
- [x] Profile page: stats, badges, referral link
- [x] Full UZ/RU/EN localization

### Phase 10 — Infrastructure & Hardening ✅
- [x] Caddy HTTPS + HTTP/2 for all services
- [x] Prometheus metrics endpoint + Grafana dashboards
- [x] Docker health checks on all services
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] Production Dockerfiles (multi-stage, non-root user)
- [x] Makefile for `make dev`, `make migrate`, `make logs`, etc.
