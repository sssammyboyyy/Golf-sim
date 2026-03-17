#!/bin/bash
# scripts/deploy.sh
set -e

# Debug: Print which variables are missing (don't print values for security)
echo "🔍 Checking build environment..."
[ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && echo "⚠️ NEXT_PUBLIC_SUPABASE_URL is missing"
[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && echo "⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"

# 1. Generate .env.production
cat << EOF > .env.production
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
YOCO_SECRET_KEY=$YOCO_SECRET_KEY
ADMIN_PIN=$ADMIN_PIN
RECONCILE_SECRET=$RECONCILE_SECRET
EOF

echo "✅ .env.production generated."

# 2. Build
npx --yes @opennextjs/cloudflare build

# 3. Hoist & Clean
[ -d ".open-next/assets" ] && cp -a .open-next/assets/. .open-next/ && rm -rf .open-next/assets
[ -f ".open-next/worker.js" ] && mv .open-next/worker.js .open-next/_worker.js

# 4. Routes
cat << 'EOF' > .open-next/_routes.json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/_next/static/*", "/images/*", "/favicon.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.css", "/*.js"]
}
EOF