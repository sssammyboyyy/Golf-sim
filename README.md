# Elite Golf Sim - Vanderbijlpark Golf Simulator Booking Platform

Vanderbijlpark's premier indoor golf simulator experience featuring Augusta National, skills challenges, and real-time bay availability.

## 🏌️ Features

### Customer-Facing
- **Real-Time Bay Availability**: Live status display showing available bays with color indicators
- **Augusta National 18 Holes**: Premium experience for 3-4 players (R480/R600)
- **Quick Play Sessions**: Solo (R250) and duo (R360) sessions on all courses
- **Walk-In Friendly**: Pay at Yoco terminal on-site at SW5 Vanderbijlpark
- **Monthly Competitions**: Longest Drive (R2000 voucher), Hole-in-One, and Closest to Pin challenges
- **POPIA Compliant**: WhatsApp opt-in for booking confirmations
- **Mobile-First Design**: Optimized for "golf simulator near me" searches
- **Secure Payments**: Yoco payment processing with cards, Apple Pay, and Google Pay

### Admin Dashboard
- **Walk-In Bookings**: Password-protected admin page for on-site bookings
- **Booking Management**: View, search, filter, and cancel bookings
- **Availability Control**: Manage time slots and bay status
- **Revenue Reports**: Track daily, weekly, and monthly revenue
- **Competition Management**: Monitor entries and leaderboards

## 🚀 Cloudflare Pages Deployment

This project is configured for deployment on Cloudflare Pages using `@cloudflare/next-on-pages`.

### Prerequisites

- Node.js 22+
- pnpm package manager
- Cloudflare account
- Supabase account
- Yoco account (South African payment gateway)

### Setup

1. **Install dependencies:**
\`\`\`bash
pnpm install
\`\`\`

2. **Run database migrations:**
Execute the SQL scripts in the `scripts/` folder in order:
- `001_create_tables.sql` - Creates database tables
- `002_enable_rls.sql` - Enables Row Level Security
- `003_seed_data.sql` - Seeds initial data
- `004_create_functions.sql` - Creates database functions

Run these directly in v0 or in your Supabase SQL editor.

3. **Configure environment variables** (in Cloudflare dashboard or locally):
\`\`\`bash
# Supabase
SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Yoco Payment Gateway
YOCO_SECRET_KEY=sk_test_your_secret_key

# App URL (for payment callbacks)
NEXT_PUBLIC_SITE_URL=https://your-site.pages.dev
\`\`\`

4. **Build for Cloudflare:**
\`\`\`bash
pnpm build
\`\`\`

5. **Deploy to Cloudflare Pages:**
\`\`\`bash
pnpm pages:deploy
\`\`\`

For detailed deployment instructions, see [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md).

## 💳 Payment Integration

- **Processor**: Yoco (South African payment gateway)
- **Methods**: All major cards, Apple Pay, Google Pay
- **Compliance**: PCI-DSS compliant hosted checkout
- **Features**: Instant settlements, no setup fees, competitive rates

### Yoco Test Cards
- **Success**: 4111 1111 1111 1111 (CVV: 123, any future date)
- **Declined**: 4000 0000 0000 0002

## 📍 Location & Hours

**Elite Golf Sim**  
SW5 Vanderbijlpark, Gauteng, South Africa

**Operating Hours:**  
Monday - Saturday: 9AM - 8PM  
Sunday: Closed

**Walk-ins Welcome:** Pay via Yoco card terminal on-site

## 🔍 SEO & Keywords

**Primary Keywords:**
- "golf simulator near me Vanderbijlpark"
- "indoor golf simulator near me Gauteng"

**Features:**
- Augusta National course simulation
- Real-time 3-bay availability display
- Walk-in welcome with on-site payment
- Mobile-optimized booking (320px+)
- Schema markup for LocalBusiness and SportsActivityLocation

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Cloudflare Workers (Edge Runtime)
- **Database**: Supabase (PostgreSQL with RLS)
- **Payments**: Yoco payment gateway
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Deployment**: Cloudflare Pages with OpenNext
- **Node Version**: 22+

## 📱 Mobile Optimization

- **Breakpoint**: 320px minimum width
- **Above-the-fold**: Real-time bay status on mobile
- **Simplified Flow**: 2-step booking for quick conversions
- **Local Search**: Optimized for "near me" searches
- **Click Actions**: Direct maps and payment integration

## 🏆 Competition Features

**Included with Every Booking:**
- **Longest Drive Challenge**: Win R2000 Pro Shop voucher monthly
- **Hole-in-One Challenge**: Instant prizes on designated holes
- **Closest to Pin**: Free 2-hour session for monthly winner

## 💰 Pricing Structure (December Launch)

### Augusta National 18 Holes
- **3 Players**: R480 (2-hour minimum required)
- **4 Players**: R600 (3-hour minimum required)
- *Note: Full time block required, no overtime permitted*

### Quick Play Sessions
- **Solo**: R250 (1-hour minimum)
- **Duo**: R360 (1-hour minimum)
- *All courses and skills challenges included*

## 🗂️ Project Structure

\`\`\`
├── app/
│   ├── page.tsx                    # Homepage with SEO optimization
│   ├── layout.tsx                  # Layout with schema markup
│   ├── booking/
│   │   ├── page.tsx               # 2-step booking flow
│   │   ├── confirm/page.tsx       # POPIA-compliant confirmation
│   │   └── success/page.tsx       # Payment success
│   ├── admin/
│   │   └── page.tsx               # Walk-in booking admin
│   └── api/
│       ├── bays/status/route.ts   # Real-time bay availability
│       └── payment/
│           ├── initialize/route.ts # Yoco payment init
│           └── verify/route.ts     # Payment verification
├── components/
│   ├── bay-status-display.tsx     # Live 3-bay status widget
│   ├── booking-flow.tsx           # Session type + booking flow
│   ├── booking-confirmation.tsx   # POPIA checkboxes + payment
│   └── admin-dashboard.tsx        # Admin interface
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Supabase client
│   │   └── middleware.ts          # Auth middleware
│   └── types.ts                   # TypeScript types
└── scripts/
    ├── 001_create_tables.sql      # Database schema
    ├── 002_enable_rls.sql         # Security policies
    ├── 003_seed_data.sql          # Initial data
    └── 004_create_functions.sql   # Database functions
\`\`\`

## 🔑 Admin Access

**Walk-In Bookings:**
1. Navigate to `/admin`
2. Enter password protection
3. Create walk-in booking (bypasses payment)
4. Generate printable receipt with QR code

**Booking Management:**
- View all bookings in real-time
- Manage bay availability
- Export revenue reports
- Track competition entries

## 🌐 Cloudflare Advantages

- **Global Edge Network**: Sub-100ms response times
- **Zero Cold Starts**: Always-on edge runtime
- **DDoS Protection**: Enterprise-grade security
- **Unlimited Bandwidth**: No egress charges
- **Cost Effective**: More affordable than Vercel

## 🚦 Launch Checklist

- [x] Augusta National and 5000+ courses
- [x] Real-time bay availability display
- [x] Walk-in payment messaging
- [x] POPIA-compliant WhatsApp opt-ins
- [x] December pricing structure
- [x] Operating hours in header + footer
- [x] SEO optimization for "near me" searches
- [x] Mobile-first responsive design
- [x] Yoco webhook endpoints configured
- [x] Schema markup for local search
- [x] Custom domain setup
- [x] Production Yoco keys
- [x] n8n automation webhook testing

## 📈 Performance Targets

- **Lighthouse Performance**: >90
- **Lighthouse Accessibility**: >95
- **Mobile Booking Time**: <60 seconds
- **Page Load Time**: <2 seconds
- **Bay Status Refresh**: 30 seconds

## 🆘 Support

**Deployment Issues:** See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)

**Technical Support:**
- Database: Check Supabase dashboard and RLS policies
- Payments: Verify Yoco keys and webhook configuration
- Environment: Confirm all variables in Cloudflare dashboard

**Production Launch:** Ensure all environment variables are updated from test to production values.

## 📄 License

© 2025 Elite Golf Sim. All rights reserved.
