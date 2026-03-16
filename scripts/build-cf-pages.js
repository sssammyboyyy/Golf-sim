const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Cloudflare Pages + OpenNext Industrial Build Adapter
 * Purpose: Ensures the OpenNext output (.open-next) perfectly matches 
 * Cloudflare Pages expectations (None Framework Preset).
 */

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, '.open-next');
const assetsSource = path.join(outputDir, 'assets');
const workerSource = path.join(outputDir, 'worker.js');
const workerTarget = path.join(outputDir, '_worker.js');

console.log('🚀 Starting Industrial Deployment Pipeline...');

function runBuild() {
  console.log('📦 Running OpenNext build...');
  execSync('npx @opennextjs/cloudflare build', { stdio: 'inherit' });
}

function processWorker() {
  if (fs.existsSync(workerSource)) {
    console.log(`✅ Renaming worker: ${workerSource} -> ${workerTarget}`);
    fs.renameSync(workerSource, workerTarget);
  } else if (!fs.existsSync(workerTarget)) {
    throw new Error('❌ Error: worker.js not found in .open-next output.');
  } else {
    console.log('ℹ️ _worker.js already exists.');
  }
}

function hoistAssets(src, dest) {
  if (!fs.existsSync(src)) {
    console.log('ℹ️ No extra assets to hoist.');
    return;
  }

  const items = fs.readdirSync(src);
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.lstatSync(srcPath).isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      hoistAssets(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  runBuild();
  
  console.log('🏗️ Standardizing output structure...');
  processWorker();

  console.log('🔗 Hoisting assets to root...');
  hoistAssets(assetsSource, outputDir);
  
  // Cleanup the now-empty assets folder to prevent index route confusion
  if (fs.existsSync(assetsSource)) {
    console.log('🧹 Cleaning up temporary assets directory...');
    fs.rmSync(assetsSource, { recursive: true, force: true });
  }

  // Final Verification
  const criticalFiles = [
    '_worker.js', 
    'index.html', 
    '_next',
    'images/upscalelogomulligan.jpeg' // Known 404 target
  ];
  
  criticalFiles.forEach(f => {
    const p = path.join(outputDir, f);
    if (!fs.existsSync(p)) {
        console.warn(`⚠️ Warning: Critical file/folder missing from output: ${f}`);
        // Consider process.exit(1) here if we want to block the build
    } else {
        console.log(`✅ Verified asset: ${f}`);
    }
  });

  console.log('✨ Build Industrialized & Standardized successfully.');

} catch (error) {
  console.error('🛑 Deployment Pipeline Failed:');
  console.error(error.message);
  process.exit(1);
}
