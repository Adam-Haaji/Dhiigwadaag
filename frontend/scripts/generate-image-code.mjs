// Convert each image in assets/images into a standalone JS module exporting a Base64 data URI
// Output: assets/image-code/<sanitizedName>.js and assets/image-code/index.js
// Usage:
//   node ./scripts/generate-image-code.mjs
//   node ./scripts/generate-image-code.mjs --print  (prints name + file path)

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const imagesDir = path.join(projectRoot, 'assets', 'images');
const outDir = path.join(projectRoot, 'assets', 'image-code');

const mimeMap = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function sanitizeName(name) {
  // keep alphanumerics, dash, underscore; replace others with dash
  return name
    .replace(/\.[^/.]+$/, '') // strip extension
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toDataUri(buffer, mime) {
  const b64 = buffer.toString('base64');
  return `data:${mime};base64,${b64}`;
}

function main() {
  ensureDir(outDir);

  const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
  const files = entries
    .filter((d) => d.isFile() && Object.keys(mimeMap).includes(path.extname(d.name).toLowerCase()))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const exportsList = [];

  for (const f of files) {
    const srcPath = path.join(imagesDir, f);
    const ext = path.extname(f).toLowerCase();
    const mime = mimeMap[ext];
    const key = sanitizeName(f);

    const buf = fs.readFileSync(srcPath);
    const dataUri = toDataUri(buf, mime);

    const fileJs = `// Auto-generated from ${path.relative(projectRoot, srcPath)}\nexport const name = ${JSON.stringify(key)};\nexport const uri = ${JSON.stringify(dataUri)};\nexport default { name, uri };\n`;

    const outPath = path.join(outDir, `${key}.js`);
    fs.writeFileSync(outPath, fileJs, 'utf8');
    exportsList.push({ key, file: `./${key}.js` });
  }

  // Write index.js for image-code
  const toIdent = (k) => {
    let v = k.replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^[0-9]/.test(v)) v = '_' + v;
    return v;
  };

  const lines = [];
  lines.push('// Auto-generated. Do not edit by hand.');
  // imports
  for (const e of exportsList) {
    const ident = toIdent(e.key);
    lines.push(`import ${ident} from '${e.file}';`);
  }
  lines.push('');
  lines.push('export const imagesCode = {');
  for (const e of exportsList) {
    const ident = toIdent(e.key);
    lines.push(`  ${JSON.stringify(e.key)}: ${ident},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const imageCodeList = Object.values(imagesCode);');
  lines.push('');

  fs.writeFileSync(path.join(outDir, 'index.js'), lines.join('\n'), 'utf8');

  console.log(`Generated ${exportsList.length} code files in ${path.relative(projectRoot, outDir)}`);
  if (process.argv.includes('--print')) {
    for (const e of exportsList) console.log(`${e.key} -> ${e.file}`);
  }
}

main();
