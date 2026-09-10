import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createIcon(size, maskable = false) {
  const stride = size * 4 + 1;
  const pixels = Buffer.alloc(stride * size);
  const safeScale = maskable ? 0.82 : 1;
  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    for (let x = 0; x < size; x += 1) {
      const index = row + 1 + x * 4;
      let color = [7, 17, 30, 255];
      const dx = Math.abs(x - size / 2) / safeScale;
      const dy = Math.abs(y - size / 2) / safeScale;
      const outer = dx / (size * 0.29) + dy / (size * 0.22) < 1;
      const inner = dx / (size * 0.19) + dy / (size * 0.14) < 1;
      if (outer && !inner) color = [86, 230, 177, 255];
      else if (inner && y > size / 2) color = [35, 75, 75, 255];
      pixels.set(color, index);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir('public/icons', { recursive: true });
await Promise.all([
  writeFile('public/icons/icon-192.png', createIcon(192)),
  writeFile('public/icons/icon-512.png', createIcon(512)),
  writeFile('public/icons/icon-maskable-512.png', createIcon(512, true)),
]);
console.log('Generated PWA raster icons from source code.');
