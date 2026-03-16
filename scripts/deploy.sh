#!/bin/bash
# scripts/deploy.sh
# Deterministic build and asset hoisting for Cloudflare Pages (OpenNext)

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting OpenNext Build..."
# FIX: Added the mandatory 'build' subcommand
npx @opennextjs/cloudflare build

echo "📂 Hoisting static assets to deployment root..."
if [ -d ".open-next/assets" ]; then
    # Use -a and dot notation to ensure all files, including hidden ones, are moved
    cp -a .open-next/assets/. .open-next/
    echo "✅ Assets hoisted successfully."
    
    # Clean up the redundant folder
    rm -rf .open-next/assets
else
    echo "⚠️  Warning: .open-next/assets directory not found. Proceeding with caution."
fi

echo "🔍 Enforcing 'The Underscore Rule' for Cloudflare routing..."
if [ ! -f ".open-next/_worker.js" ]; then
    if [ -f ".open-next/worker.js" ]; then
        echo "🔄 Renaming worker.js to _worker.js..."
        mv .open-next/worker.js .open-next/_worker.js
    else
        echo "❌ CRITICAL ERROR: _worker.js not found in .open-next/ root."
        echo "Build failed. Aborting deployment."
        exit 1
    fi
fi

echo "✅ Entry point verified."

echo "📊 Deployment Bucket Hierarchy Preview:"
# List the root to verify _next, images, and _worker.js are sitting side-by-side
ls -la .open-next | head -n 15

echo "✨ Success! Final build structure prepared for Cloudflare Pages."
