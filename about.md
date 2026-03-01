# UzumBot - Project Documentation

## Overview

**UzumBot** is a Telegram-based rewards platform for Uzum Market that allows users to submit product reviews and earn spins on a prize wheel. The system integrates a Telegram bot, a FastAPI backend, an admin dashboard, and a Telegram Mini App (webapp).

## Project Structure

This is a **pnpm monorepo** containing 4 packages:

```
/root/u_bot
├── packages/
│   ├── admin/       # React admin dashboard (Vite + React 19)
│   ├── backend/     # FastAPI Python backend
│   ├── bot/         # Aiogram Telegram bot
│   └── webapp/     # React Telegram Mini App (Vite + React 19)
├── infra/           # Infrastructure configuration
│   ├── caddy/       # Caddy reverse proxy config
│   ├── grafana/     # Grafana dashboards
│   └── prometheus/  # Prometheus metrics config
├── docker-compose.yml
├── Makefile
└── package.json
```

## Technology Stack

### Backend (`packages/backend`)
- **FastAPI** - Python web framework
- **PostgreSQL** - Primary database (asyncpg)
- **Redis** - Caching, session storage, Celery broker
- **Celery** - Async task queue for notifications
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migrations
- **MinIO** - S3-compatible object storage for images
- **Pydantic** - Data validation
- **Python-Jose** - JWT authentication
- **Prometheus** - Metrics collection

### Bot (`packages/bot`)
- **Aiogram 3.x** - Telegram bot framework
- **aiohttp** - Async HTTP client
- **Redis** - FSM storage
- **Structlog** - Structured logging

### Admin (`packages/admin`)
- **React 19** - Frontend framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **TanStack Query** - Server state management
- **TanStack Table** - Data tables
- **Recharts** - Charts and analytics
- **Zustand** - Client state management
- **Radix UI** - UI components
- **React Hook Form + Zod** - Form handling and validation

### Webapp (`packages/webapp`)
- **React 19** - Frontend framework
- **Vite** - Build tool
- **Telegram Apps SDK** - Telegram Mini App integration
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **Zustand** - State management

## Core Features

### 1. User Management
- Telegram-based registration and authentication
- Multi-language support (Uzbek, Russian, English)
- Referral system with bonus spins
- User profiles with stats (submissions, spins, wins)
- Ban/unban functionality

### 2. Product Reviews
- Users submit product reviews with order numbers and photos
- Admin reviews and approves/rejects submissions
- Duplicate detection using perceptual image hashing
- Approved submissions grant spin tokens
- Users can track submission status

### 3. Prize Spin System
- Spin-to-win wheel with weighted prize probabilities
- Provably fair RNG using server seed + client seed + nonce
- Multiple prize types:
  - Discounts
  - Cashback
  - Free products
  - Gift cards
  - Charity donations
- Claim codes for prizes
- Expiration system for rewards

### 4. Referral System
- Unique referral codes per user
- Bonus spins for referring new users
- Referral tracking and analytics
- Notification system for referral bonuses

### 5. Charity System
- Campaign-based charity fundraising
- Users can donate rewards or direct funds
- Leaderboard for top donors
- Progress tracking toward campaign goals
- Multi-language campaign content

### 6. Rewards & Wallet
- View all earned rewards
- Claim rewards with unique codes
- Donate rewards to charity
- Expiration tracking

### 7. Notifications
- In-app notification system
- Telegram message notifications via bot
- Notification types:
  - Submission approved/rejected
  - Reward earned
  - Reward expiring
  - Referral bonus
  - Broadcast messages

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `POST /api/v1/webhook/telegram` - Telegram webhook receiver
- `GET /api/v1/products` - List active products

### Authentication
- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - Logout

### User Endpoints
- `GET /api/v1/me` - Current user profile
- `GET /api/v1/me/referral` - Referral stats
- `GET /api/v1/rewards` - User rewards
- `POST /api/v1/rewards/{id}/claim` - Claim reward
- `POST /api/v1/rewards/{id}/donate` - Donate reward to charity
- `GET /api/v1/charity/campaigns` - List charity campaigns
- `POST /api/v1/charity/donate` - Donate to charity
- `GET /api/v1/charity/leaderboard` - Donation leaderboard

### Submissions
- `POST /api/v1/submissions` - Create submission
- `GET /api/v1/submissions` - List user submissions
- `GET /api/v1/submissions/{id}` - Get submission details

### Spins
- `POST /api/v1/spins/commit` - Commit spin (server seed)
- `POST /api/v1/spins/reveal` - Reveal spin result
- `GET /api/v1/spins/verify/{id}` - Verify spin fairness

### Bot Internal
- `POST /api/v1/bot/register` - Register/update user from bot
- `GET /api/v1/bot/user/{telegram_id}` - Get user info for bot

### Admin Endpoints
- **Users**: CRUD operations, ban/unban, view stats
- **Submissions**: Review, approve/reject, bulk actions
- **Prizes**: CRUD, stock management, weights
- **Products**: CRUD, activate/deactivate
- **Charity**: Campaign management, donation tracking
- **Analytics**: Dashboard metrics, user activity
- **Audit Logs**: Track admin actions
- **Admins**: Admin user management, roles
- **Settings**: System configuration
- **Broadcast**: Send messages to all users
- **Reports**: Export data (Excel)

## Database Models

### Core Models
- **User** - Telegram user data, stats, referral info
- **Product** - Uzum Market products for review
- **Submission** - User review submissions
- **SubmissionImage** - Uploaded review images with perceptual hash
- **Prize** - Prize wheel prizes
- **PrizeSpin** - Spin history with fairness verification
- **SpinCommitment** - Server seed commitments
- **Reward** - Earned prizes ready for claim

### Charity Models
- **CharityCampaign** - Charity campaigns
- **CharityDonation** - Donation records

### Admin Models
- **AdminUser** - Admin accounts
- **AdminRole** - Role-based permissions
- **AuditLog** - Action logging
- **Setting** - Key-value settings
- **Notification** - User notifications queue

## Infrastructure

### Services (docker-compose)
- **postgres** - PostgreSQL 16 database
- **redis** - Redis 7 for caching and Celery
- **minio** - S3-compatible object storage
- **backend** - FastAPI application
- **celery_worker** - Celery worker for async tasks
- **celery_beat** - Celery beat scheduler
- **bot** - Telegram bot (webhook or polling)
- **admin** - React admin dashboard
- **webapp** - React Telegram Mini App
- **caddy** - Reverse proxy with SSL
- **prometheus** - Metrics collection
- **grafana** - Metrics visualization

### Environment Variables
Required variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `CELERY_BROKER_URL` - Celery broker
- `MINIO_ENDPOINT` - MinIO server
- `BOT_TOKEN` - Telegram bot token
- `BOT_WEBHOOK_SECRET` - Webhook secret
- `JWT_SECRET` - JWT signing key
- `ENVIRONMENT` - production/development

## Admin Dashboard Pages

1. **Dashboard** - Overview with charts (users, submissions, spins, rewards)
2. **Users** - User management with search, filters, ban actions
3. **Submissions** - Review queue with approve/reject/bulk actions
4. **Prizes** - Prize management (CRUD, stock, weights)
5. **Products** - Product catalog management
6. **Charity** - Campaign management and donation tracking
7. **Analytics** - Detailed metrics and activity
8. **Audit Logs** - Admin action history
9. **Admins** - Admin user and role management
10. **Settings** - System configuration
11. **Broadcast** - Message broadcasting to users
12. **Reports** - Data export (Excel)

## Bot Commands

- `/start` - Start/restart bot
- `/submit` - Submit a review
- `/status` - View submission status
- `/myspins` - View available spins
- `/referral` - View referral program
- `/wallet` - View rewards
- `/charity` - View charity campaigns
- `/language` - Change language
- `/help` - Help information

## Telegram Mini App Pages

1. **Home** - Overview with spins, referrals
2. **Spin** - Prize wheel interface
3. **Reviews** - Submission history
4. **Wallet** - Rewards and claiming
5. **Profile** - User stats and referral code
6. **Charity** - Campaigns and donations

## Development

### Running Locally
```bash
# Install dependencies
pnpm install

# Run all services in development mode
pnpm dev

# Build all packages
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test
```

### Individual Package Development
```bash
# Admin (port 4000)
cd packages/admin && pnpm dev

# Webapp (port 5173)
cd packages/webapp && pnpm dev

# Backend (requires PostgreSQL, Redis, MinIO)
cd packages/backend && uvicorn app.main:app --reload

# Bot (requires Redis, backend running)
cd packages/bot && python -m app.main
```

## Security Features

- JWT authentication for admin and API
- TOTP 2FA for admin accounts
- HMAC validation for webhooks
- Rate limiting (slowapi)
- CORS configuration
- Security headers
- Input validation (Pydantic, Zod)
- Audit logging
- Password hashing (bcrypt)

## Internationalization

Supported languages:
- Uzbek (uz) - Default
- Russian (ru)
- English (en)

All user-facing content is localized in all three languages.

## File Storage

Images are stored in MinIO with:
- Organized bucket structure
- Perceptual hashing for duplicate detection
- Automatic optimization
- CDN-ready configuration
