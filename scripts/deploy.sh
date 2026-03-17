#!/bin/bash
# scripts/deploy.sh
set -e

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    exit 1
fi

cat << EOF > .env.production
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
YOCO_SECRET_KEY=${YOCO_SECRET_KEY}
ADMIN_PIN=${ADMIN_PIN}
AUTOMATION_WEBHOOK_URL=${AUTOMATION_WEBHOOK_URL:-$N8N_WEBHOOK_URL}
N8N_WEBHOOK_SECRET=${N8N_WEBHOOK_SECRET}
RECONCILE_SECRET=${RECONCILE_SECRET}
EOF

npx --yes @opennextjs/cloudflare build

if [ -d ".open-next/assets" ]; then
    cp -a .open-next/assets/. .open-next/
    rm -rf .open-next/assets
fi

if [ -f ".open-next/worker.js" ]; then
    mv .open-next/worker.js .open-next/_worker.js
elif [ ! -f ".open-next/_worker.js" ]; then
    exit 1
fi

cat << 'EOF' > .open-next/_routes.json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/_next/static/*", "/images/*", "/favicon.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.css", "/*.js"]
}
EOF
