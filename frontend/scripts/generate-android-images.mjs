#!/usr/bin/env node
/*
Generate Android density PNGs from images in frontend/assets/image

Usage:
  node ./scripts/generate-android-images.mjs [--sizes large|small] [--flatten]

- Sources: all .png files under assets/image (non-recursive)
- Outputs: assets/image/android/{mdpi,hdpi,xhdpi,xxhdpi}/<basename>.png
- Sizes preset:
  large (default): mdpi 100x100, hdpi 150x150, xhdpi 200x200, xxhdpi 300x300
  small:           mdpi 48x48,   hdpi 72x72,   xhdpi 96x96,   xxhdpi 144x144

By default we preserve transparency. Use --flatten to render onto white background.
*/

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const ASSETS_DIR = path.join(ROOT, 'assets', 'image');
const OUT_BASE = path.join(ASSETS_DIR, 'android');

const args = process.argv.slice(2);
const useSmall = args.includes('--sizes=small') || args.includes('--small');
const flatten = args.includes('--flatten');

const sizes = useSmall
  ? { mdpi: [48, 48], hdpi: [72, 72], xhdpi: [96, 96], xxhdpi: [144, 144] }
  : { mdpi: [100, 100], hdpi: [150, 150], xhdpi: [200, 200], xxhdpi: [300, 300] };

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('\nMissing dependency: sharp');
  console.error('Install with:');
  console.error('  cd frontend');
  console.error('  npm i -D sharp');
  process.exit(2);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function listPngs(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && /\.png$/i.test(d.name))
    .map(d => path.join(dir, d.name));
  return files;
}

async function processOne(inputPath) {
  const base = path.basename(inputPath);
  for (const [bucket, [w, h]] of Object.entries(sizes)) {
    const outDir = path.join(OUT_BASE, bucket);
    ensureDir(outDir);
    const outPath = path.join(outDir, base);
    const pipeline = sharp(inputPath)
      .resize({ width: w, height: h, fit: 'contain', background: flatten ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 });
    if (flatten) pipeline.flatten({ background: '#FFFFFF' });
    await pipeline.toFile(outPath);
    console.log(`✓ ${bucket} ${w}x${h} -> ${path.relative(ROOT, outPath)}`);
  }
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('Assets directory not found:', ASSETS_DIR);
    process.exit(1);
  }
  const files = listPngs(ASSETS_DIR);
  if (files.length === 0) {
    console.warn('No PNG files found in', ASSETS_DIR);
    return;
  }
  console.log(`Found ${files.length} PNG(s). Generating Android densities (${useSmall ? 'small' : 'large'})...`);
  for (const f of files) {
    await processOne(f);
  }
  console.log('\nDone. Output in', path.relative(ROOT, OUT_BASE));
}

main().catch(err => { console.error(err?.stack || String(err)); process.exit(1); });
