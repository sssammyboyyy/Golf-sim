#!/bin/bash
# Industrial OpenNext Asset Hoisting Protocol
set -e

# DO NOT include rm -rf here; cleanup happens in npm run clean.
echo "--- ⛵ Hoisting Assets for Cloudflare Pages ---"
if [ -d ".open-next/assets" ]; then
    echo "Transferring nested assets to root outdir..."
    # Copy _next and other static folders to the root of .open-next
    cp -a .open-next/assets/. .open-next/
    # Cleanup only the nested source folder to prevent duplication
    rm -rf .open-next/assets
    echo "✅ Hoisting Complete."
else
    echo "⚠️ Warning: .open-next/assets not found. Checking root for _next..."
fi

echo "--- 🔧 Finalizing Worker Structure ---"
if [ -f ".open-next/worker.js" ]; then
    mv .open-next/worker.js .open-next/_worker.js
    echo "✅ worker.js -> _worker.js"
elif [ -f ".open-next/_worker.js" ]; then
    echo "✅ _worker.js already in place."
else
    echo "❌ ERROR: No worker bundle detected."
    exit 1
fi

echo "--- 🌐 Writing Route Manifest ---"
cat << 'EOF' > .open-next/_routes.json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/_next/static/*", "/images/*", "/favicon.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.css", "/*.js"]
}
EOF
echo "✅ _routes.json Generated."