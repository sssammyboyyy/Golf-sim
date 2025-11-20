# Cloudflare Pages Deployment Guide

This Next.js 15 golf booking application is configured to deploy to Cloudflare Pages using `@cloudflare/next-on-pages`.

## Prerequisites

1. **Node.js 22+** - Ensure you have Node.js 22 or higher installed
2. **pnpm** - This project uses pnpm as the package manager
3. **Cloudflare Account** - Sign up at https://dash.cloudflare.com
4. **Wrangler CLI** - Install globally: `npm install -g wrangler@latest`

## Environment Variables

To ensure your application functions correctly, you must configure the following environment variables. These should be set dynamically in the Cloudflare Dashboard and NOT hardcoded in your application files.

### 1. Configure in `wrangler.toml` (for structure)
We have added a `[vars]` section to your `wrangler.toml` file. This tells Cloudflare which variables your application expects.
**Note:** Keep the values empty in `wrangler.toml` to avoid committing secrets to version control.

### 2. Configure in Cloudflare Dashboard (for values)
Go to **Settings** → **Environment Variables** in your Cloudflare Pages project and add the following:

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anonymous Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `N8N_WEBHOOK_URL` | URL for your n8n workflow | `https://n8n.yourdomain.com/webhook/...` |
| `YOCO_SECRET_KEY` | Secret key for Yoco payments | `sk_live_...` |
| `NEXT_PUBLIC_APP_URL` | The URL of your deployed app | `https://themulligan.co.za` |

### Required Variables:
\`\`\`bash
# Supabase
SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Yoco Payment Gateway
YOCO_SECRET_KEY=sk_live_your_secret_key

# n8n Webhook for Booking Notifications
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/bookings

# Admin Coupon Code (for walk-in bookings)
ADMIN_COUPON_CODE=your_secure_admin_code

# App URL (Your Cloudflare Pages URL)
NEXT_PUBLIC_APP_URL=https://your-site.pages.dev
\`\`\`

## Local Development

1. **Install dependencies:**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Create a `.env.local` file** with your environment variables (see `.env.example`)

3. **Run the development server:**
   \`\`\`bash
   pnpm dev
   \`\`\`

4. **Test with Cloudflare Pages locally:**
   \`\`\`bash
   npx @cloudflare/next-on-pages
   wrangler pages dev .vercel/output/static
   \`\`\`

## Deployment Options

### Option 1: Deploy via Cloudflare Dashboard (Recommended for Production)

1. **Push your code to GitHub/GitLab**

2. **Go to Cloudflare Dashboard** → Workers & Pages → Create Application → Pages

3. **Connect your repository** and select the branch

4. **Configure build settings:**
   - **Build command:** `pnpm install && npx @cloudflare/next-on-pages`
   - **Build output directory:** `.vercel/output/static`
   - **Root directory:** `/`
   - **Environment variables:** Add all variables listed above

5. **Advanced settings:**
   - **Node version:** `22`
   - **Compatibility flags:** Add `nodejs_compat`

6. **Save and Deploy!**

### Option 2: Deploy via Wrangler CLI

1. **Authenticate with Cloudflare:**
   \`\`\`bash
   wrangler login
   \`\`\`

2. **Build the application:**
   \`\`\`bash
   pnpm install
   npx @cloudflare/next-on-pages
   \`\`\`

3. **Deploy to Pages:**
   \`\`\`bash
   wrangler pages deploy .vercel/output/static --project-name=mulligan-golf-booking
   \`\`\`

4. **Set environment variables via CLI:**
   \`\`\`bash
   wrangler pages secret put SUPABASE_URL --project-name=mulligan-golf-booking
   wrangler pages secret put YOCO_SECRET_KEY --project-name=mulligan-golf-booking
   # Repeat for all required variables
   \`\`\`

### Option 3: Continuous Deployment (Automated)

Once you connect via Option 1:
- Every push to `main` branch triggers automatic deployment
- Pushes to other branches create preview deployments
- Pull requests get unique preview URLs

## Custom Domain Setup

1. **Add Custom Domain:**
   - Go to your Pages project → Custom domains
   - Click "Set up a custom domain"
   - Enter your domain (e.g., `themulligan.co.za` or `www.themulligan.co.za`)

2. **DNS Configuration:**
   
   **If domain is on Cloudflare:**
   - DNS records are added automatically ✅
   
   **If domain is external:**
   - Add CNAME record at your DNS provider:
     \`\`\`
     Type: CNAME
     Name: @ (for root) or www (for subdomain)
     Target: your-project.pages.dev
     \`\`\`

3. **SSL Certificate:**
   - Automatically provisioned (1-5 minutes)
   - Free SSL/TLS with auto-renewal

## Key Differences from Vercel

### 1. **Payment Integration**
- Migrated from Paystack to **Yoco** payment processor
- Yoco is optimized for South African businesses
- API endpoints: `/app/api/payment/initialize` and `/app/api/payment/verify`

### 2. **Build Process**
- Using `@cloudflare/next-on-pages` adapter
- Build output: `.vercel/output/static`
- No more `ignoreBuildErrors` - production-ready code only

### 3. **Edge Runtime**
- API routes use `export const runtime = 'edge'`
- Middleware runs on Cloudflare Workers
- Ensures optimal performance globally

### 4. **Analytics**
- Removed `@vercel/analytics` (Vercel-specific)
- Use Cloudflare Web Analytics (free) or your preferred solution

### 5. **Database & Auth**
- Supabase continues to work seamlessly
- Edge runtime compatible
- No changes needed to database configuration

## Yoco Payment Setup

1. **Create a Yoco account:** https://portal.yoco.com
2. **Get your API keys:** Portal → Settings → API Keys
   - Use **Test keys** for development
   - Use **Live keys** for production
3. **Test the integration** with Yoco's test card numbers
4. **Configure webhooks** (optional): Portal → Settings → Webhooks
   - Webhook URL: `https://your-site.pages.dev/api/payment/webhook`

## n8n Webhook Integration

The booking system sends data to your n8n webhook at two points:

1. **Booking Creation** - When a booking is created (before payment)
2. **Payment Confirmation** - When payment is completed

**Webhook Payload:**
\`\`\`json
{
  "event": "booking.created" | "booking.payment_completed",
  "booking_id": "uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+27123456789",
  "booking_date": "2025-01-15",
  "start_time": "14:00",
  "duration_hours": 2,
  "session_type": "quick_play" | "famous_course",
  "famous_course_option": "4ball" | "3ball" | null,
  "player_count": 4,
  "bay_id": 1,
  "total_amount": 1200,
  "deposit_amount": 400,
  "accept_whatsapp": true,
  "enter_competition": false,
  "payment_status": "pending" | "completed"
}
\`\`\`

## Troubleshooting

### Build Errors

**Error: "Expected output file not found"**
- Solution: The build output directory should be `.vercel/output/static`, not `.open-next/server`
- Update your Cloudflare Pages build settings

**Error: TypeScript compilation errors**
- Solution: Fix all TypeScript errors (no `ignoreBuildErrors` in production)
- Run `pnpm build` locally to catch errors early

**Error: pnpm-lock.yaml mismatch**
- Solution: Delete `node_modules` and `pnpm-lock.yaml`, then run `pnpm install`

### Runtime Errors

**Error: "Supabase client not initialized"**
- Solution: Verify environment variables are set in Cloudflare Dashboard
- Check that both `SUPABASE_URL` and `SUPABASE_ANON_KEY` (with and without `NEXT_PUBLIC_`) are set

**Error: Edge runtime not supported**
- Solution: Ensure API routes have `export const runtime = 'edge'`
- Avoid using Node.js-specific APIs in edge routes

### Payment Issues

**Error: "Yoco payment initialization failed"**
- Solution: Verify `YOCO_SECRET_KEY` is correct
- Check if using test keys vs live keys appropriately
- Ensure callback URLs match your domain

**Webhook not receiving data**
- Solution: Verify `N8N_WEBHOOK_URL` is set correctly
- Check n8n webhook is active and accessible
- Review Cloudflare Functions logs

## Performance Optimization

Cloudflare Pages provides:
- **Global CDN** - 275+ data centers worldwide
- **Edge Functions** - API routes run at the edge (sub-50ms)
- **Automatic caching** - Static assets cached globally
- **DDoS protection** - Built-in Layer 3/4/7 protection
- **Zero cold starts** - Unlike traditional serverless

## Monitoring & Analytics

1. **Cloudflare Web Analytics** (Free):
   - Add to your Pages project settings
   - Privacy-friendly, no cookies required

2. **Cloudflare Functions Logs**:
   - View real-time logs in dashboard
   - Debug API route issues

3. **Supabase Dashboard**:
   - Monitor database queries
   - Check RLS policy effectiveness

## Support & Resources

- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Next.js on Cloudflare:** https://developers.cloudflare.com/pages/framework-guides/nextjs/
- **@cloudflare/next-on-pages:** https://github.com/cloudflare/next-on-pages
- **Yoco API Docs:** https://developer.yoco.com/
- **Cloudflare Community:** https://community.cloudflare.com/

## Quick Reference Commands

\`\`\`bash
# Local development
pnpm dev

# Build for Cloudflare Pages
npx @cloudflare/next-on-pages

# Deploy to Cloudflare Pages
wrangler pages deploy .vercel/output/static --project-name=mulligan-golf-booking

# Preview locally with Wrangler
wrangler pages dev .vercel/output/static

# View deployments
wrangler pages deployment list --project-name=mulligan-golf-booking

# Tail production logs
wrangler pages deployment tail --project-name=mulligan-golf-booking
\`\`\`

## Post-Deployment Checklist

- [ ] All environment variables configured in Cloudflare Dashboard
- [ ] Custom domain connected with SSL active
- [ ] Supabase database accessible from Cloudflare edge
- [ ] Payment gateway (Yoco) tested end-to-end
- [ ] n8n webhook receiving booking data
- [ ] Booking flow works completely
- [ ] Admin coupon codes functional for walk-ins
- [ ] Mobile responsiveness verified
- [ ] SEO metadata correct for all pages
- [ ] 404 and error pages working properly

Your golf booking site is now live on Cloudflare Pages! 🎉⛳
