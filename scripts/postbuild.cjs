// Copy electron entry files into the CRA build folder so electron-builder's react-cra preset (which sets main to build/electron.js)
// points to a real file at runtime.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcElectron = path.join(root, 'public', 'electron.js');
const srcPreload = path.join(root, 'public', 'preload.js');
const srcSplash = path.join(root, 'public', 'splash.html');
const outDir = path.join(root, 'build');
const outElectron = path.join(outDir, 'electron.js');
const outPreload = path.join(outDir, 'preload.js');
const outSplash = path.join(outDir, 'splash.html');

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[postbuild] Missing source: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log(`[postbuild] Copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
}

if (!fs.existsSync(outDir)) {
  console.error(`[postbuild] Missing build dir: ${outDir}`);
  process.exit(1);
}

copyFile(srcElectron, outElectron);
copyFile(srcPreload, outPreload);
copyFile(srcSplash, outSplash);
