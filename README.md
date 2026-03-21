# The Mulligan — Venue OS: AI-Automated Booking & Operations Platform

> **A production SaaS platform** built from zero for a live indoor golf simulator venue. Features a real-time management HUD, event-driven automation, self-healing payment orchestration, and a full POS engine — handling real bookings, real payments, and real customers.

[![Live in Production](https://img.shields.io/badge/Status-Live%20%26%20Revenue%20Generating-brightgreen?style=for-the-badge)](https://themulligan.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Runtime-Cloudflare%20Edge-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![n8n](https://img.shields.io/badge/Automation-n8n%20Workflows-EA4B71?style=for-the-badge)](https://n8n.io/)

---

## Why This Project Matters

This is not a tutorial clone or a portfolio toy. **The Mulligan is a live, revenue-generating operations platform** serving real customers at a physical venue. It was scoped, designed, built, and shipped entirely by one person — under real business deadlines, with real consequences for downtime.

It demonstrates the ability to:

- **Own the full stack** — Database schema design, payment gateway integration, edge deployment, automated email workflows, and an internal management HUD, all in one codebase.
- **Engineer for reliability** — Race condition handling, idempotency anchors, PostgreSQL exclusion constraints, atomic boolean guards, and a payment state reconciliation worker. These aren't afterthoughts — they're core to how the system operates.
- **Replace manual work with automation** — Three production n8n workflows eliminate booking confirmations, customer reminders, and lead generation research that would otherwise require full-time operational staff.
- **Ship under pressure** — Delivered to production in weeks, iterating continuously against real customer feedback.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER EXPERIENCE                            │
│   Mobile-First Booking Flow → Bay Selection → Payment → Confirmation   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   EDGE RUNTIME (Cloudflare Workers)                     │
│                                                                         │
│  ┌──────────────┐  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │  Booking API  │  │  Payment Orchestrator│  │  n8n Trigger Engine    │ │
│  │              │  │                     │  │                        │ │
│  │ • Availability│  │ • Yoco Checkout Init│  │ • Post-Payment Trigger │ │
│  │ • Ghost Purge │  │ • Webhook Verifier  │  │ • Self-Healing State   │ │
│  │ • 23P01 Retry │  │ • Reconcile Worker  │  │ • Idempotency Guard    │ │
│  │ • Idempotency │  │ • Deposit/Full Split│  │ • Email Payload Build  │ │
│  └──────┬───────┘  └──────────┬──────────┘  └──────────┬─────────────┘ │
│         │                     │                        │               │
└─────────┼─────────────────────┼────────────────────────┼───────────────┘
          │                     │                        │
          ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL + RLS)                         │
│                                                                         │
│  bookings │ simulators │ pricing │ coupons │ booking_dashboard (view)  │
│  • EXCLUDE USING gist constraint (physical double-booking prevention)  │
│  • booking_request_id UNIQUE (application-layer idempotency)           │
│  • email_sent atomic bool (automation dedup guard)                     │
│  • purge_ghost_bookings() RPC (slot conflict recovery)                │
│  • 15+ versioned migrations                                            │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   AUTOMATION LAYER (Self-Hosted n8n)                    │
│                                                                         │
│  ┌──────────────────────┐   ┌──────────────────────────────────────┐   │
│  │  Booking Confirmation │   │  24h / 1h Reminder Engine            │   │
│  │  (Webhook Triggered)  │   │  (Cron: Every 30 Minutes)            │   │
│  │                      │   │                                      │   │
│  │  1. Auth + Validate  │   │  1. Query upcoming confirmed slots   │   │
│  │  2. Update DB State  │   │  2. Filter: reminder_sent = false    │   │
│  │  3. Render HTML Email│   │  3. Render & send branded HTML email │   │
│  │  4. Dispatch via     │   │  4. Mark reminder_sent = true        │   │
│  │     Resend API       │   │                                      │   │
│  │  5. Store + Owner    │   └──────────────────────────────────────┘   │
│  │     Notification     │                                              │
│  └──────────────────────┘   ┌──────────────────────────────────────┐   │
│                             │  AI Lead Gen Pipeline (n8n)          │   │
│                             │  • Google Dorking → Parse Targets    │   │
│                             │  • Dedup via Supabase                │   │
│                             │  • Gemini AI Pitch Synthesis         │   │
│                             │  • Telegram Founder Alerts           │   │
│                             └──────────────────────────────────────┘   │
│                                                                         │
│  Transport: Resend API    │    Observability: n8n_status per row       │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VENUE OS MANAGER HUD (Admin)                         │
│                                                                         │
│  • Live Ledger — Gross Revenue, Outstanding, Players, Bookings          │
│  • Date Navigator with SAST enforcement                                 │
│  • Per-booking: Bay colour coding, Settle/Unsettle one-tap action      │
│  • ManagerModal — Full POS terminal: bay selector, time picker,         │
│    retail inventory, add-ons, manual price override with reset         │
│  • Walk-in creation + hard-delete (Ghost Cleanup protocol)             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Engineering Deep-Dives

### 1. The Double-Booking Problem — Solved at the Database Level

**Problem:** Two users booking the same simulator bay at the same time is a critical failure mode. Application-layer locks aren't reliable under race conditions.

**Solution:** A PostgreSQL `EXCLUDE USING gist` constraint makes double-booking physically impossible at the database level, completely independent of application code:

```sql
ALTER TABLE public.bookings
ADD CONSTRAINT exclude_overlapping_slots
EXCLUDE USING gist (
  simulator_id WITH =,
  tstzrange(slot_start, slot_end, '[)') WITH &&
);
```

If a conflict occurs (PostgreSQL error `23P01`), the API self-heals:
1. Calls the `purge_ghost_bookings()` RPC to hard-delete abandoned pending rows holding the slot.
2. Waits 200ms for the constraint to breathe.
3. Retries the `INSERT` exactly once before returning a `409 Conflict`.

---

### 2. Self-Healing Payment State Machine

**Problem:** After a Yoco payment, the payment webhook updating `amount_paid` and the frontend triggering the confirmation email fired concurrently. The email engine would sometimes see `amount_paid = 0` and send incorrect financial details to the customer.

**Solution:** The `/api/trigger-n8n` route implements a self-healing state machine. If the database shows `amount_paid = 0` but a `yoco_payment_id` exists, it proactively verifies directly with the Yoco API, patches the DB, and constructs the email payload with corrected figures — zero manual intervention:

```typescript
// Self-healing: verify with payment provider when DB state lags behind webhook
if (booking.yoco_payment_id && dbPaid === 0) {
  const yocoData = await verifyPaymentWithYoco(booking.yoco_payment_id);
  if (yocoData.status === 'successful') {
    dbPaid = yocoData.metadata?.depositPaid ?? yocoData.amount / 100;
    await supabaseAdmin.from("bookings").update({
      amount_paid: dbPaid,
      status: "confirmed",
    });
  }
}
```

A separate **Reconciliation Worker** (`/api/reconcile-payments`) runs on a cron schedule, cross-referencing all `pending` bookings against the Yoco API to catch any payments that slipped through the webhook — a final safety net with zero manual operation.

---

### 3. Idempotency Architecture

**Problem:** Double-click submissions, network retries, and webhook replays all risk creating duplicate or corrupted bookings.

**Solution:** A layered idempotency system:

| Guard | Layer | Mechanism |
|---|---|---|
| `booking_request_id` | Application | Client-generated UUID, `UNIQUE` constraint rejects replays |
| `EXCLUDE USING gist` | Database | Physical slot overlap prevention, constraint-level |
| `email_sent` | Automation | Atomic boolean checked before n8n dispatch — never sends twice |
| Ghost Cleanup RPC | Database | Purges `pending` rows with no payment ID after 5 minutes |

---

### 4. Venue OS Manager HUD — A Real POS Terminal

The admin dashboard is not a simple CRUD table. It's a full **Point-of-Sale operations terminal** built for venue staff:

- **Live Ledger** — Real-time tally of gross revenue, outstanding balances, player counts, and booking volume for any selected date, with SAST timezone enforcement.
- **Bidirectional Settle/Unsettle** — One-tap payment settlement or reversal directly from the booking row.
- **ManagerModal POS** — Full booking editor with reactive pricing:
  - Bay assignment (Lounge, Middle, Window) and time picker
  - Player count driving automatic tiered rate calculation
  - Add-ons (club rentals, coaching, retail inventory) with manager-editable per-item prices
  - **Manual Price Override** — Manager can override the calculated total; an `OVERRIDE` badge appears and a reset button snaps back to the computed price
- **Walk-in Creation** — Instantly creates in-store bookings with `booking_source: 'walk_in'` bypassing the payment gateway
- **Ghost Cleanup Delete** — Two-step destructive delete with confirmation, triggers hard-delete to release PostgreSQL exclusion constraints

---

### 5. POS Pricing Engine

The tiered pricing model is enforced in both the UI and the database `get_price` SQL function:

| Players | Hourly Rate | Per-Person Rate |
|---|---|---|
| 1 | R 250 / hr | R 250 pp |
| 2 | R 360 / hr | R 180 pp |
| 3 | R 480 / hr | R 160 pp |
| 4 | R 600 / hr | R 150 pp |

**Add-ons:**
- Club Rentals: R100/hr
- Coaching (flat): R250
- Retail (Water, Gloves, Balls): Manager-configurable per-item price, persisted to `addon_*_price` columns

---

### 6. SAST Timezone Authority

**Problem:** Cloudflare Edge Workers run in UTC. `new Date()` without explicit timezone handling produces booking timestamps that are 2 hours behind SAST (UTC+02:00), causing slot collisions and incorrect display times.

**Solution:** A strict `createSASTTimestamp` helper is the single source of truth for all date construction. Direct `new Date()` calls are a system failure:

```typescript
/**
 * Normalizes any date/time input to a strict SAST (UTC+02:00) ISO string.
 * Prevents Cloudflare Edge UTC-zero drift across all API routes.
 */
export function createSASTTimestamp(date: string, time: string): string {
  const cleanTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${cleanTime}+02:00`;
}
```

---

### 7. n8n Automation Workflows (What They Replace)

Three production workflows run autonomously:

| Workflow | Trigger | Manual Work Eliminated |
|---|---|---|
| **Booking Confirmation** | Webhook (POST from app after payment) | Manual email composition to customer + separate store owner notification |
| **24h & 1h Reminders** | Cron (every 30 min) | Staff manually texting/calling customers the day before and hour before |
| **AI Lead Gen Pipeline** | Cron (scheduled) | Manual business research, lead qualification, and personalised outreach drafting |

Each workflow is secret-authenticated, writes structured execution status back to its booking row (`n8n_status`, `n8n_response`, `n8n_last_attempt_at`), and produces branded HTML email templates rendered dynamically with booking-specific data.

---

### 8. Edge-Native Deployment on Cloudflare

The entire application runs on Cloudflare Workers via the `@opennextjs/cloudflare` adapter, giving sub-100ms global response times with zero cold starts and built-in DDoS protection.

The build pipeline handles the non-obvious adapter requirements:

```bash
# Build, normalize entry point, and hoist static assets
next build
npx @opennextjs/cloudflare build
mv .open-next/worker.js .open-next/_worker.js       # Cloudflare requires underscore prefix
cp -r .open-next/assets/* .open-next/               # Asset hoisting from nested to root
```

> **Why this matters:** Cloudflare Pages requires `_worker.js` at the root of the output directory and static assets at the root — not nested in `/assets/`. The OpenNext adapter doesn't produce this structure by default. Building this deploy script was a critical path item to getting the site working.

---

## Tech Stack

| Layer | Technology | Decision Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Server components, file-based API routing, React 19 |
| **Runtime** | Cloudflare Workers (via OpenNext) | Sub-100ms globally, zero cold starts, zero server management |
| **Database** | Supabase PostgreSQL | Row-Level Security, real-time, managed platform, exclusion constraints |
| **Payments** | Yoco | South African payment gateway — Visa, Mastercard, Apple Pay, Google Pay |
| **Automation** | n8n (self-hosted) | Visual workflow builder, webhook + cron triggers, 400+ integrations |
| **Email** | Resend | Transactional email API with built-in deliverability tracking |
| **AI / LLM** | Google Gemini | Personalised pitch synthesis in the lead gen pipeline |
| **Styling** | Vanilla CSS | Zero-dependency, no framework constraints |
| **UI Primitives** | Radix UI | Unstyled, accessible components (Dialog, Select, Switch, etc.) |
| **Notifications** | Telegram Bot API | Real-time founder alerts for leads and new bookings |
| **Observability** | Structured logging + DB columns | Correlation IDs, n8n execution status, full payment audit trail |

---

## API Surface

13 API route groups — all running on Cloudflare Edge:

| Route Group | Endpoints | Purpose |
|---|---|---|
| `/api/availability` | `GET` | Real-time bay availability for a given date |
| `/api/payment/initialize` | `POST` | Create Yoco checkout session; includes ghost purge before slot creation |
| `/api/payment/verify` | `POST` | Yoco webhook receiver — confirms booking, triggers n8n |
| `/api/bookings` | `GET/POST` | Core booking CRUD |
| `/api/bookings/admin-create` | `POST` | PIN-authenticated walk-in booking creation |
| `/api/bookings/admin-delete` | `POST` | Hard-delete to release exclusion constraint |
| `/api/bookings/admin-dashboard` | `POST` | PIN-authenticated ledger view (uses `booking_dashboard` view) |
| `/api/bookings/update` | `POST` | Booking edits + settlement state transitions |
| `/api/quote` | `POST` | Dynamic pricing calculation |
| `/api/coupons` | `POST` | Coupon validation and discount application |
| `/api/reconcile-payments` | `POST` | Cron-driven payment reconciliation against Yoco API |
| `/api/bays/status` | `GET` | Live bay occupancy status widget |
| `/api/webhooks/*` | `POST` | Inbound webhook handlers (Yoco, etc.) |

---

## Database Schema (15 Versioned Migrations)

```
scripts/
├── 001_create_tables.sql              # Core schema: bookings, simulators, pricing, coupons
├── 002_enable_rls.sql                 # Row-Level Security policies
├── 003_seed_data.sql                  # Initial pricing tiers and simulator configuration
├── 004_create_functions.sql           # PostgreSQL functions: availability checks, get_price
├── 005_add_booking_fields.sql         # Payment tracking: yoco_payment_id, amount_paid
├── 006_update_pricing_and_courses.sql # Business rule updates
├── 007_add_addons_to_bookings.sql     # Coaching + club hire add-on columns
├── 008_add_public_booking_policy.sql  # Anonymous booking RLS policy
├── 009_add_consumable_addons.sql      # Retail inventory: water, gloves, balls
├── 010_hardening_and_idempotency.sql  # booking_request_id UNIQUE, conflict guards
├── 011_fix_unique_slot_constraint.sql # EXCLUDE USING gist double-booking constraint
├── fix_double_booking_constraint.sql  # Production hotfix: slot collision resolution
├── migration_reminders.sql            # Reminder tracking columns
└── supabase_security_patch.sql        # Security hardening, SECURITY DEFINER functions
```

---

## Project Structure

```
the-mulligan/
├── app/
│   ├── page.tsx                     # Landing page (SEO-optimized, schema markup)
│   ├── layout.tsx                   # Root layout with structured data
│   ├── booking/
│   │   ├── page.tsx                 # Multi-step booking flow with player config
│   │   ├── confirm/page.tsx         # Payment confirmation + POPIA consent
│   │   └── success/page.tsx         # Post-payment success + automation trigger
│   ├── admin/
│   │   └── page.tsx                 # Venue OS Manager HUD (PIN-gated)
│   └── api/                         # 13 API route groups (all Cloudflare Edge)
├── components/
│   ├── admin/
│   │   ├── live-view-tab.tsx        # Live Ledger HUD with stats + booking rows (356 lines)
│   │   └── manager-modal.tsx        # Full POS terminal modal (338 lines)
│   ├── booking-flow.tsx             # Session selection + player configuration
│   ├── booking-confirmation.tsx     # Payment gateway integration component
│   ├── BayStatusDisplay.tsx         # Real-time availability widget
│   └── booking-success.tsx          # Post-payment state management
├── lib/
│   ├── types.ts                     # Full TypeScript domain model
│   ├── schedule-config.ts           # Operating hours + pricing rules
│   ├── utils.ts                     # createSASTTimestamp, getSASTDate, correlation IDs
│   └── supabase/                    # Client / server / middleware Supabase setup
├── scripts/
│   ├── *.sql                        # 15 database migrations
│   ├── deploy.sh                    # Cloudflare build pipeline (asset hoisting)
│   ├── n8n_*.json                   # Exportable n8n workflow definitions
│   └── update_n8n.py                # Programmatic workflow patching utility
└── wrangler.toml                    # Cloudflare deployment config
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Configure environment (see Required Environment Variables below)
cp .env.example .env.local

# Start development server
npm run dev

# Build for Cloudflare Pages (runs OpenNext + deploy.sh asset hoisting)
npm run pages:build

# Preview locally with Wrangler
npm run preview

# Deploy to production
npm run deploy
```

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Frontend anon key (RLS-protected reads)
SUPABASE_SERVICE_ROLE_KEY=         # Admin key (ghost cleanup, reconciliation)
YOCO_SECRET_KEY=                   # Yoco payment API key
N8N_WEBHOOK_URL=                   # Booking confirmation webhook URL
N8N_WEBHOOK_SECRET=                # Webhook auth secret
RECONCILE_SECRET=                  # Cron auth for reconciliation worker
ADMIN_PIN=                         # Manager HUD PIN (numeric)
NEXT_PUBLIC_SITE_URL=              # Base URL for redirect callbacks
```

---

## Production Metrics

| Metric | Value |
|---|---|
| **Status** | Live & processing real bookings |
| **Time to Production** | Weeks (zero-to-production solo build) |
| **API Routes** | 13 edge-runtime route groups |
| **Database Migrations** | 15 versioned, idempotent scripts |
| **Automated Workflows** | 3 production n8n pipelines |
| **Manual Operations Replaced** | Confirmation emails, reminders, store alerts, lead gen research |
| **Double-Booking Prevention** | PostgreSQL `EXCLUDE USING gist` constraint — database-level, not app-level |
| **Payment Recovery** | Automated reconciliation cron + self-healing state machine |

---

## What I'd Build Next

This system already demonstrates the automation foundation. The natural evolution layers in more intelligence:

- **AI customer service agent** — Conversational booking modifications and FAQs connected to live Supabase data, reducing inbound message volume to zero.
- **Predictive scheduling** — Analyze historical booking patterns to surface optimal dynamic pricing windows and staffing recommendations.
- **Voice booking agent** — Phone-based booking and inquiry handling using the existing API surface and an LLM + Twilio layer.
- **Multi-venue orchestration** — Abstract the automation layer to manage N venues from a single n8n instance, turning this into a true SaaS product.

---

## License

Proprietary. Built and maintained by [Samuel](https://github.com/sssammyboyyy).

> *Venue OS is live at [themulligan.org](https://themulligan.org).*
