# 🧠 The Mulligan: Knowledge Graph Index (2026-03-17)

## 🏛️ Core Architectural Entities

### 1. Unified Manager HUD ([ManagerModal](file:///c:/Users/samue/OneDrive/Documents/projects/TheMulligan/components/admin/manager-modal.tsx#24-253))
- **Type**: Frontend React Component (TSX)
- **Pattern**: "Zero-Tab" HUD (Single-column card stack)
- **Relations**: 
  - Triggers `Ghost Cleanup API` via `onDelete`.
  - Triggers `Update API` or `Admin Create API` via `onSave`.
- **Observations**: Uses `bg-muted/30` and `border` for visual "Cards" grouping. Flattened for UX speed.

### 2. Administrative API Layer
- **Delete Route**: [app/api/bookings/admin-delete/route.ts](file:///c:/Users/samue/OneDrive/Documents/projects/TheMulligan/app/api/bookings/admin-delete/route.ts)
  - **Logic**: Executes HARD DELETE on Supabase.
  - **Constraint**: Must free PostgreSQL `EXCLUDE USING gist` constraint immediately.
- **Create Route**: [app/api/bookings/admin-create/route.ts](file:///c:/Users/samue/OneDrive/Documents/projects/TheMulligan/app/api/bookings/admin-create/route.ts)
  - **Logic**: Implements Tiered Pricing & Manager Price Overrides.
  - **Runtime**: Dynamic Node (Edge runtime removed for OpenNext compatibility).
- **Public Route**: [app/api/booking/route.ts](file:///c:/Users/samue/OneDrive/Documents/projects/TheMulligan/app/api/booking/route.ts)
  - **Logic**: Enforces Tiered Pricing on the server side (PENDING status).

## ⚖️ Business Logic & Constraints

### 1. Tiered Hourly Rates (Venue Standard)
| Player Count | Total Hourly Rate |
| :--- | :--- |
| 1 | R 250 |
| 2 | R 360 |
| 3 | R 480 |
| 4 | R 600 |

### 2. POS Add-on Logic
- **Club Rentals**: R 100 * `duration_hours`.
- **Coaching (Armand)**: R 250 (Flat fee, 30 min session).
- **Retail Persistence**: Managers can override price per unit.
  - Database Fields: `addon_water_price`, `addon_gloves_price`, `addon_balls_price`.
  - Logic: `qty * (override_price ?? standard_default)`.

### 3. Ghost Cleanup Protocol
- **Action**: Severe hard-delete of the booking record.
- **Purpose**: Defensive measure to unblock the database exclusion constraint if a session is "stuck" or needs immediate clearing.

## 🌍 Global Constraints
- **Timezone**: SAST (+02:00) enforced via `createSASTTimestamp`.
- **Booking Collision Recovery**: System captures `23P01` PostgreSQL conflict codes on `insert/update` and triggers an immediate RPC `purge_ghost_bookings` backoff to resolve the double-booking stale state.
- **Runtime Restriction**: `export const runtime = 'edge'` is strictly BANNED in indvidual routes due to OpenNext bundling issues. Global deployment handles the edge adapter.
