# Industrial Recovery Audit: The Mulligan Venue OS

**Date**: 2026-03-16
**Status**: 100% Stabilized & Pushed
**Target Environment**: Next.js 15 / Cloudflare Pages (OpenNext)

---

## 1. Supabase Infrastructure Standardization
The mismatch between `@supabase/ssr` patterns and legacy `supabase-js` imports was the primary cause of local `TypeError` crashes. We unified the client layer.

### [FILE] `lib/supabase/client.ts`
Standardized exports to provide both Browser and Admin instances using the singleton pattern.

```typescript
import { createBrowserClient as createSSRClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Standardized Browser Client for App Router
 */
export function createBrowserClient() {
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Admin Singleton (Service Role) - Restricted to Server Side
 */
const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createSupabaseClient(supabaseAdminUrl, supabaseAdminKey, {
  auth: { persistSession: false }
});
```

---

## 2. SAST (+02:00) Authority Enforcement
The application suffered from a 2-hour "Data Ghosting" window (10 PM - 12 AM) where UTC dates drifted from South African Standard Time. We enforced SAST at the utility level.

### [FILE] `lib/utils.ts`
```typescript
/**
 * Enforces SAST (Africa/Johannesburg) Date String
 * Returns: "YYYY-MM-DD"
 */
export function getSASTDate() {
    return new Intl.DateTimeFormat('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date()).split('/').reverse().join('-');
}

/**
 * Creates SAST ISO Timestamp for DB insertion
 */
export function createSASTTimestamp() {
    const now = new Date();
    const offset = 2 * 60 * 60 * 1000; // SAST is UTC+2
    return new Date(now.getTime() + offset).toISOString();
}
```

---

## 3. Runtime & Bundle Optimization
OpenNext bundling fails if non-API pages are explicitly set to `runtime = 'edge'`. We re-aligned the page runtimes while keeping API routes on the Edge for performance.

### [FILES] `app/admin/page.tsx` & `app/booking/success/page.tsx`
- **Action**: Removed `export const runtime = 'edge';`.
- **Reason**: To allow the server bundle in `.open-next/server-functions/default` to resolve dependencies correctly.

### [COMPONENT] `WeeklyScheduleTab` SAST Fix
```typescript
// Previously: new Date() (UTC)
// Now: Optimized SAST Anchor
const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(getSASTDate()), { weekStartsOn: 1 })
);
```

---

## 4. Pipeline Hardening (Cloudflare Alignment)
Modified the deployment script to handle the specific requirements of Cloudflare Pages.

### [FILE] `scripts/deploy.sh`
- **The Underscore Rule**: Renaming `worker.js` to `_worker.js` for Cloudflare entry-point detection.
- **Asset Hoisting**: Moving files from `.open-next/assets/` to the root to prevent 404 errors on static chunks.

```bash
# Asset Hoisting Logic
if [ -d ".open-next/assets" ]; then
    cp -r .open-next/assets/* .open-next/
    rm -rf .open-next/assets
fi
```

---

## 5. Security & Secret Protection
- Added `Service Account Google Cloud Consle/` to `.gitignore`.
- Resolved GitHub Push Protection blocking caused by accidental staging of service account JSONs.

---

## 🧪 Verification Log
1. **Type Safety**: `npx tsc --noEmit` passed.
2. **Build Confidence**: `next build` completed with 8/8 static pages generated.
3. **Registry**: `bestmulligan` branch updated with Commit `f1c9603`.
