#!/bin/bash
set -e

export NEXT_PUBLIC_SUPABASE_URL="https://twvysbtjimrqcgulaich.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dnlzYnRqaW1ycWNndWxhaWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNTcyOTEsImV4cCI6MjA3ODkzMzI5MX0.BP2L6C13Uey5d3L6SlDUz73_e2UhmJ_N-Snvo9m1K94"
export YOCO_SECRET_KEY="placeholder_until_approval"

cat << EOF > .env.production
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
YOCO_SECRET_KEY=$YOCO_SECRET_KEY
ADMIN_PIN=$ADMIN_PIN
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