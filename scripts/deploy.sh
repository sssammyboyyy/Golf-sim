#!/bin/bash

# Industrial Deployment Pipeline for Cloudflare Pages (OpenNext)
echo "🚀 Starting OpenNext Build..."
npx @opennextjs/cloudflare build

# 🛠 Step 1: Standardize Entry Point
# Cloudflare Pages expects _worker.js (with underscore) at the root
if [ -f ".open-next/worker.js" ]; then
    echo "✅ Renaming worker.js to _worker.js"
    mv .open-next/worker.js .open-next/_worker.js
fi

# 🏗 Step 2: Hoist Assets
# OpenNext nests assets in /assets, but Cloudflare serves from root
if [ -d ".open-next/assets" ]; then
    echo "🔗 Moving assets from .open-next/assets/ to .open-next/"
    cp -r .open-next/assets/* .open-next/
    rm -rf .open-next/assets
fi

echo "✨ Success! Final build structure prepared in .open-next/"
