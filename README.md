# The Mulligan — AI-Automated Booking & Operations Platform

> **Full-stack SaaS platform** for a live indoor golf simulator venue, built from zero to production in weeks. Features **event-driven workflow automation**, **real-time payment orchestration**, and an **AI-powered operations pipeline** — all shipped to real paying customers.

[![Live](https://img.shields.io/badge/Status-Live%20in%20Production-brightgreen)](https://themulligan.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Edge Runtime](https://img.shields.io/badge/Runtime-Cloudflare%20Edge-orange)](https://pages.cloudflare.com/)
[![n8n Automations](https://img.shields.io/badge/Automations-n8n%20Workflows-red)](https://n8n.io/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)](https://supabase.com/)

---

## Why This Project Matters

This isn't a tutorial project or a weekend side project. **The Mulligan is a live revenue-generating platform** handling real bookings, processing real payments, and sending automated communications to real customers for an operating golf simulator venue.

It demonstrates:

- **Shipping under pressure** — Built and iterated to production with real-world business deadlines
- **End-to-end ownership** — From database schema design to payment integration to automated email workflows
- **Automation-first mindset** — Manual operational work replaced by event-driven n8n workflows that handle confirmations, reminders, and store notifications without human intervention
- **Production-grade engineering** — Race condition handling, idempotency guards, Row-Level Security, self-healing payment state machines, and structured observability

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER EXPERIENCE                          │
│  Mobile-First Booking Flow → Session Selection → Payment → Success  │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EDGE RUNTIME (Cloudflare Workers)                 │
│                                                                      │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  Booking API │  │  Payment Gateway │  │  n8n Trigger Engine    │  │
│  │  /api/book   │  │  /api/payment/*  │  │  /api/trigger-n8n     │  │
│  │              │  │                  │  │                        │  │
│  │  • Availability│ │  • Yoco Checkout │  │  • Race Condition Fix  │  │
│  │  • Slot Lock  │  │  • Webhook Verify│  │  • Self-Healing State  │  │
│  │  • Idempotency│ │  • Deposit/Full  │  │  • Email Filtering     │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬─────────────┘  │
│         │                   │                       │                │
└─────────┼───────────────────┼───────────────────────┼────────────────┘
          │                   │                       │
          ▼                   ▼                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL + RLS)                      │
│                                                                      │
│  bookings │ simulators │ pricing │ coupons                           │
│  • Row-Level Security policies    • 11+ versioned migrations        │
│  • Idempotent booking constraints • Unique slot conflict guards     │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  AUTOMATION LAYER (Self-Hosted n8n)                   │
│                                                                      │
│  ┌─────────────────────┐    ┌────────────────────────────────┐      │
│  │  Booking Confirmed  │    │  24h / 1h Reminder Engine      │      │
│  │  (Webhook Trigger)  │    │  (Schedule: Every 30 min)      │      │
│  │                     │    │                                │      │
│  │  1. Validate + Auth │    │  1. Query upcoming bookings    │      │
│  │  2. Update DB State │    │  2. Filter unnotified guests   │      │
│  │  3. Render Customer │    │  3. Send branded HTML email    │      │
│  │     Email (HTML)    │    │  4. Mark reminder as sent      │      │
│  │  4. Send via Resend │    │                                │      │
│  │  5. Render Store    │    └────────────────────────────────┘      │
│  │     Notification    │                                            │
│  │  6. Send to Owner   │    ┌────────────────────────────────┐      │
│  └─────────────────────┘    │  Lead Gen Pipeline (AI)        │      │
│                             │  • Google Dorking → Parse      │      │
│                             │  • Dedup via Supabase          │      │
│                             │  • Gemini AI Pitch Synthesis   │      │
│                             │  • Telegram Notifications      │      │
│                             └────────────────────────────────┘      │
│                                                                      │
│  Transport: Resend API (transactional email)                        │
│  Observability: n8n_status tracking per booking row                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Engineering Decisions

### 1. Race Condition Resolution (Payment ↔ Email Timing)

**Problem:** After Yoco payment, the webhook updating `amount_paid` and the frontend triggering the confirmation email fired concurrently. The email engine would see `amount_paid = 0` and send incorrect financial details.

**Solution:** The `/api/trigger-n8n` endpoint implements a **self-healing state machine** — if the database shows `amount_paid = 0` but a `yoco_payment_id` exists, it proactively verifies the payment status directly with the Yoco API, patches the database, and constructs the email payload with corrected data. Zero manual intervention required.

```typescript
// Self-healing: verify with payment provider when DB state lags
if (booking.yoco_payment_id && dbPaid === 0) {
  const yocoData = await verifyPaymentWithYoco(booking.yoco_payment_id)
  if (yocoData.status === 'successful') {
    dbPaid = yocoData.metadata?.depositPaid ?? yocoData.amount / 100
    await supabaseAdmin.from("bookings").update({ amount_paid: dbPaid, status: "confirmed" })
  }
}
```

### 2. Idempotent Booking Architecture

**Problem:** Double-click submissions, network retries, and webhook replays all risk creating duplicate bookings.

**Solution:** Every booking carries a `booking_request_id` (client-generated idempotency key). A unique constraint on `(simulator_id, slot_start, slot_end)` prevents physical double-booking at the database level, regardless of application-layer bugs.

### 3. n8n Workflow Automation (Replacing Manual Work)

Three production n8n workflows automate what would otherwise require a full-time operations person:

| Workflow | Trigger | What It Replaces |
|---|---|---|
| **Booking Confirmation** | Webhook (POST from app) | Manual email composition + sending to customer AND store owner |
| **24h/1h Reminders** | Cron (every 30 min) | Staff manually texting/calling customers before their session |
| **Lead Gen Pipeline** | Cron (scheduled) | Manual lead research, qualification, and outreach drafting |

Each workflow is **secret-authenticated**, writes execution status back to the database (`n8n_status`, `n8n_response`, `n8n_last_attempt_at`), and produces **branded HTML email templates** rendered at execution time with booking-specific data.

### 4. Edge-First, Zero Cold Starts

The entire app runs on **Cloudflare Workers edge runtime**. API routes execute in <100ms globally. No server provisioning, no container management, no cold start penalties.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Server components, edge-compatible API routes, file-based routing |
| **Runtime** | Cloudflare Workers | Sub-100ms globally, zero cold starts, DDoS protection included |
| **Database** | Supabase PostgreSQL | Row-Level Security, real-time subscriptions, managed auth |
| **Payments** | Yoco | South African payment gateway — cards, Apple Pay, Google Pay |
| **Automation** | n8n (self-hosted) | Visual workflow builder, webhooks, cron triggers, 400+ integrations |
| **Email** | Resend | Transactional email API with deliverability tracking |
| **AI/LLM** | Google Gemini | Pitch synthesis in lead gen pipeline |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Rapid UI iteration with accessible component primitives |
| **Notifications** | Telegram Bot API | Real-time founder alerts for new leads and bookings |
| **Observability** | Structured logging + DB tracking | Correlation IDs, n8n execution status, payment audit trail |

---

## Database Schema

11 versioned migrations managing the full lifecycle:

```
scripts/
├── 001_create_tables.sql           # Core schema: bookings, simulators, pricing, coupons
├── 002_enable_rls.sql              # Row-Level Security policies
├── 003_seed_data.sql               # Initial pricing and simulator configuration
├── 004_create_functions.sql        # PostgreSQL functions for availability checks
├── 005_add_booking_fields.sql      # Payment tracking fields
├── 006_update_pricing_and_courses.sql  # Business rule updates
├── 007_add_addons_to_bookings.sql  # Coaching + club hire add-ons
├── 008_add_public_booking_policy.sql   # Anonymous booking RLS policy
├── 009_add_consumable_addons.sql   # Walk-in consumable items
├── 010_hardening_and_idempotency.sql   # Unique constraints, conflict guards
├── 011_fix_unique_slot_constraint.sql  # Double-booking prevention
├── fix_double_booking_constraint.sql   # Hotfix: production slot collision
├── migration_reminders.sql         # Reminder tracking columns
└── supabase_security_patch.sql     # Security hardening
```

---

## API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/availability` | `GET` | Real-time bay availability for a given date |
| `/api/payment/initialize` | `POST` | Create Yoco checkout session with deposit/full payment logic |
| `/api/payment/verify` | `POST` | Webhook endpoint for Yoco payment confirmation |
| `/api/trigger-n8n` | `POST` | Orchestrate post-payment automation (emails, DB updates) |
| `/api/bookings` | `GET/POST` | CRUD operations for booking management |
| `/api/bays/status` | `GET` | Live bay occupancy status |
| `/api/quote` | `POST` | Dynamic pricing calculation |
| `/api/coupons` | `POST` | Coupon validation and application |

All API routes run on **edge runtime** with structured error responses, correlation IDs, and environment variable validation.

---

## Project Structure

```
the-mulligan/
├── app/
│   ├── page.tsx                    # Landing page (SEO-optimized)
│   ├── layout.tsx                  # Root layout with schema markup
│   ├── booking/
│   │   ├── page.tsx                # Multi-step booking flow
│   │   ├── confirm/page.tsx        # Payment confirmation + POPIA consent
│   │   └── success/page.tsx        # Post-payment success + automation trigger
│   ├── admin/
│   │   └── page.tsx                # Operations dashboard (943 lines)
│   └── api/                        # 9 API route groups (all edge runtime)
├── components/
│   ├── booking-flow.tsx            # Session selection + player config
│   ├── booking-confirmation.tsx    # Payment gateway integration
│   ├── BayStatusDisplay.tsx        # Real-time availability widget
│   ├── booking-success.tsx         # Post-payment state management
│   └── ui/                         # 15 shadcn/ui primitives
├── lib/
│   ├── types.ts                    # Full TypeScript domain model
│   ├── schedule-config.ts          # Operating hours + pricing rules
│   ├── utils.ts                    # Correlation IDs, logging, validation
│   └── supabase/                   # Client/server/middleware Supabase setup
├── scripts/
│   ├── *.sql                       # 15 database migrations
│   ├── n8n_*.json                  # Exportable n8n workflow definitions
│   └── update_n8n.py               # Programmatic workflow patching tool
└── worker.js                       # Cloudflare Worker entry point
```

---

## Automation Highlight: What I'd Build Next

This project demonstrates the **foundation** of what I build: systems that replace manual operational work with event-driven automation. The natural evolution:

- **AI-powered customer service agent** — Handle booking inquiries, modifications, and FAQs via a conversational interface connected to the live Supabase data
- **Predictive scheduling agent** — Analyze historical booking patterns to suggest optimal pricing and staffing
- **Voice agent integration** — Phone-based booking and inquiry handling using the existing API surface
- **Multi-venue orchestration** — Generalize the automation layer to manage N venues from a single n8n instance

---

## Running Locally

```bash
# Install dependencies
npm install

# Set environment variables (see .env.example)
cp .env.example .env.local

# Run development server
npm run dev

# Build for Cloudflare Pages
npm run pages:build

# Deploy to production
npm run deploy
```

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
YOCO_SECRET_KEY=
N8N_WEBHOOK_URL=
NEXT_PUBLIC_SITE_URL=
```

---

## Metrics

| Metric | Value |
|---|---|
| **Time to Production** | Weeks, not months |
| **Database Migrations** | 15 (versioned, idempotent) |
| **API Endpoints** | 9 edge-runtime routes |
| **Automated Workflows** | 3 production n8n pipelines |
| **Lines of Application Code** | ~4,000+ (excluding node_modules) |
| **Manual Operations Replaced** | Booking confirmations, reminders, store alerts, lead gen |

---

## License

Proprietary. Built and maintained by [Samuel](https://github.com/sssammyboyyy).
