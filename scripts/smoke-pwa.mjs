import { access, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const index = await readFile('dist/index.html', 'utf8');
assert(!index.includes('/src/main.tsx'), 'dist/index.html must not reference TypeScript source');
assert.match(index, /\/3DPrintPreviewAR\/assets\//, 'built assets must use the GitHub Pages base');
const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.start_url, '/3DPrintPreviewAR/');
assert.equal(manifest.scope, '/3DPrintPreviewAR/');
await access('dist/sw.js');
for (const icon of manifest.icons) await access(`dist/${icon.src}`);
console.log('GitHub Pages/PWA build smoke test passed.');
