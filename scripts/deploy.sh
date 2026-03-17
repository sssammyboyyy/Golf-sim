#!/bin/bash
# scripts/deploy.sh
# Industrial-Grade Build & Deployment for Cloudflare Pages (OpenNext)

set -e

echo "🔐 Bridging Cloudflare Environment Variables to Next.js..."
# This ensures that both public and secret keys are available to the Next.js compiler/runtime
cat << EOF > .env.production
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
YOCO_SECRET_KEY="${YOCO_SECRET_KEY}"
ADMIN_PIN="${ADMIN_PIN}"
AUTOMATION_WEBHOOK_URL="${AUTOMATION_WEBHOOK_URL:-$N8N_WEBHOOK_URL}"
N8N_WEBHOOK_SECRET="${N8N_WEBHOOK_SECRET}"
RECONCILE_SECRET="${RECONCILE_SECRET}"
CLOUDFLARE_EMAIL="${CLOUDFLARE_EMAIL:-samuelj121314@gmail.com}"
EOF
echo "✅ .env.production generated."

echo "🚀 Starting OpenNext Build via Cloudflare Adapter..."
npx @opennextjs/cloudflare build

echo "📂 Hoisting static assets to deployment root..."
if [ -d ".open-next/assets" ]; then
    cp -a .open-next/assets/. .open-next/
    echo "✅ Assets hoisted successfully."
    rm -rf .open-next/assets
else
    echo "⚠️  Warning: .open-next/assets directory not found."
fi

echo "🔍 Enforcing 'The Underscore Rule' for Cloudflare routing..."
if [ ! -f ".open-next/_worker.js" ]; then
    if [ -f ".open-next/worker.js" ]; then
        echo "🔄 Renaming worker.js to _worker.js..."
        mv .open-next/worker.js .open-next/_worker.js
    else
        echo "❌ CRITICAL ERROR: _worker.js not found in .open-next/ root."
        exit 1
    fi
fi

echo "🛡️ Generating _routes.json to prevent Asset 404s..."
cat << 'EOF' > .open-next/_routes.json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/_next/static/*", "/images/*", "/favicon.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.css", "/*.js"]
}
EOF

echo "📊 Deployment Bucket Hierarchy Preview:"
ls -la .open-next | head -n 15

echo "☁️ Triggering Cloudflare Pages Deployment..."
npx wrangler pages deploy .open-next --project-name themes-golf-sim

echo "✨ Success! Production Release Complete."
