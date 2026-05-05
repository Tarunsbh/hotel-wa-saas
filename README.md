# 🏨 Hotel WhatsApp SaaS

Production-level WhatsApp Messaging SaaS for hotels built on **WhatsApp Cloud API (Meta)**.

---

## Architecture

```
hotel-wa-saas/
├── schema.sql              ← ✅ Complete MySQL schema (import directly)
├── docker-compose.yml      ← One-command full stack
│
├── backend/                ← NestJS + Prisma + BullMQ
│   ├── src/
│   │   ├── auth/           ← JWT auth, roles
│   │   ├── hotels/         ← Hotel + token management
│   │   ├── guests/         ← Contact management + CSV import
│   │   ├── templates/      ← WhatsApp template CRUD + Meta sync
│   │   ├── campaigns/      ← Bulk campaign management
│   │   ├── conversations/  ← Chat inbox
│   │   ├── messages/       ← Message send/receive
│   │   ├── automation/     ← Rule-based trigger engine
│   │   ├── queue/          ← BullMQ workers (message, campaign, token)
│   │   ├── analytics/      ← Dashboard + reports
│   │   ├── webhook/        ← Meta webhook handler
│   │   └── whatsapp/       ← WhatsApp Cloud API client
│   └── prisma/
│       └── schema.prisma   ← Prisma ORM schema
│
└── frontend/               ← React 18 + Vite + Tailwind
    └── src/pages/
        ├── Dashboard       ← KPI cards + charts
        ├── Contacts        ← Guest management + CSV import
        ├── Templates       ← Template builder + Meta sync
        ├── Campaigns       ← Campaign creator + analytics
        ├── Inbox           ← Real-time WhatsApp chat UI
        ├── Automation      ← Rule engine UI
        └── Settings        ← Hotel config + token storage
```

---

## Database Schema

The `schema.sql` file contains **15 fully-relational MySQL tables**:

| Table | Description |
|-------|-------------|
| `hotels` | Multi-tenant root entity |
| `users` | Agents / managers / admins |
| `token_storage` | AES-256 encrypted access tokens |
| `tags` | Guest categorization labels |
| `guests` | Hotel contacts/customers |
| `guest_tags` | Many-to-many guest↔tag |
| `templates` | WhatsApp message templates |
| `campaigns` | Bulk message campaigns |
| `campaign_recipients` | Per-guest delivery status |
| `conversations` | Chat threads |
| `messages` | Individual WhatsApp messages |
| `automation_rules` | Trigger-based rules |
| `automation_logs` | Rule execution history |
| `logs` | System/API/error logs |

**Import directly:**
```bash
mysql -u root -p hotel_wa_saas < schema.sql
```

---

## Quick Start — Docker (Recommended)

The root `.env` file already contains working defaults. Simply set your WhatsApp Cloud API credentials and start:

```bash
# 1. Edit the root .env and set your Meta credentials:
#   WA_ACCESS_TOKEN=<your Meta permanent/long-lived access token>
#   WA_PHONE_NUMBER_ID=<your WhatsApp phone number ID>
#   WA_BUSINESS_ACCOUNT_ID=<your WhatsApp Business Account ID>
#   WEBHOOK_VERIFY_TOKEN=apple   ← already set to 'apple'

# 2. Start everything (MySQL + Redis + Backend + Frontend)
docker-compose up -d

# 3. Follow backend logs (DB push + seed + server start)
docker-compose logs -f backend
```

Access:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001/api/v1
- **Swagger Docs**: http://localhost:3001/api/docs

> **Note**: On first start the backend automatically runs `prisma db push` to create all tables, then seeds the default admin account. No manual database setup needed.

---

## Local Development

### Prerequisites
- Node.js 18+
- MySQL 8.0
- Redis 7

### Backend

```bash
cd backend

# Install
npm install

# Set up env (copy and edit)
cp .env.example .env
# Edit .env — set DB_HOST=localhost, WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, etc.

# Generate Prisma client + sync schema to DB (creates all tables)
npx prisma generate
npx prisma db push

# Seed default admin account (admin@demo.com / Admin@123)
npx ts-node src/seed.ts

# Start dev server
npm run start:dev
```

Server starts at **http://localhost:3001**
Swagger at **http://localhost:3001/api/docs**

### Frontend

```bash
cd frontend

npm install

# Create env file
echo "VITE_API_URL=http://localhost:3001/api/v1" > .env

npm run dev
```

Frontend at **http://localhost:5173**

---

## API Reference

All endpoints require `Authorization: Bearer <jwt>` unless noted.

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login → JWT |
| POST | `/api/v1/auth/register` | Create agent (Admin/Manager) |
| GET | `/api/v1/auth/me` | Current user profile |
| GET | `/api/v1/auth/agents` | List all agents |

### Guests
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/guests` | List (search, status, tag, paginate) |
| POST | `/api/v1/guests` | Create guest |
| PATCH | `/api/v1/guests/:id` | Update guest |
| DELETE | `/api/v1/guests/:id` | Soft delete |
| POST | `/api/v1/guests/import-csv` | CSV bulk import |
| POST | `/api/v1/guests/:id/opt-out` | WhatsApp opt-out |

### Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/templates` | List templates |
| POST | `/api/v1/templates` | Create template |
| POST | `/api/v1/templates/sync` | Sync from Meta |
| POST | `/api/v1/templates/:id/submit` | Submit to Meta for approval |
| POST | `/api/v1/templates/:id/duplicate` | Clone template |

### Campaigns
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/campaigns` | List campaigns |
| POST | `/api/v1/campaigns` | Create campaign |
| POST | `/api/v1/campaigns/:id/launch` | Launch / schedule |
| POST | `/api/v1/campaigns/:id/cancel` | Cancel |
| GET | `/api/v1/campaigns/:id/stats` | Delivery analytics |

### Conversations & Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/conversations` | List inbox |
| PATCH | `/api/v1/conversations/:id/assign` | Assign agent |
| PATCH | `/api/v1/conversations/:id/status` | Change status |
| GET | `/api/v1/messages/conversation/:id` | Message history |
| POST | `/api/v1/messages/send/text` | Send text |
| POST | `/api/v1/messages/send/template` | Send template |
| POST | `/api/v1/messages/send/media` | Send media |

### Automation
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/automation/rules` | List rules |
| POST | `/api/v1/automation/rules` | Create rule |
| PATCH | `/api/v1/automation/rules/:id/toggle` | Enable/disable |
| POST | `/api/v1/automation/rules/:id/run-now` | Manual trigger |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/analytics/dashboard` | KPIs |
| GET | `/api/v1/analytics/message-volume` | Daily volume chart |
| GET | `/api/v1/analytics/campaigns` | Campaign performance |

### Webhook (Meta → Your Server)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/webhook` | Meta verification |
| POST | `/api/v1/webhook` | Receive events |

---

## Webhook Setup (Meta Developer Console)

1. Start backend + expose it publicly: `ngrok http 3001`
2. In Meta Developer Console → WhatsApp → Configuration:
   - **Callback URL**: `https://your-ngrok-url.ngrok-free.app/api/v1/webhook`
   - **Verify Token**: `apple`  *(matches `WEBHOOK_VERIFY_TOKEN=apple` in `.env`)*
3. Subscribe to webhook fields: `messages`, `message_status_updates`
4. Click **Verify and Save**

For Docker with a public domain, point the callback URL to `https://yourdomain.com/api/v1/webhook`.

---

## Default Login

Seeded automatically on first `docker-compose up` (or manually via `npx ts-node src/seed.ts`):

| Email | Password | Role |
|-------|----------|------|
| admin@demo.com | Admin@123 | Admin |

---

## Queue Architecture (Redis + BullMQ)

| Queue | Jobs | Purpose |
|-------|------|---------|
| `messages` | `send-template` | Send individual WhatsApp messages with retry |
| `campaigns` | `process` | Batch-process campaign recipients (50/batch) |
| `automation` | `execute-rule` | Run automation rules for matching guests |
| `token-refresh` | `refresh` | Auto-refresh tokens before expiry |

All queues: 3 retries, exponential backoff (5s base), dead-letter storage.

---

## Security

- JWT authentication on all API routes
- AES-256 encrypted token storage in MySQL
- bcrypt (cost 12) password hashing
- Rate limiting: 100 req/min per IP
- Helmet.js security headers
- Input validation via class-validator
- Soft deletes (no permanent data loss)
- Webhook signature validation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript |
| ORM | Prisma 5 |
| Database | MySQL 8 |
| Cache/Queue | Redis 7 + BullMQ |
| Real-time | Socket.IO |
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| API Docs | Swagger/OpenAPI |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
