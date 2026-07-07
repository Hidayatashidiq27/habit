/*
 * Generator ikon PWA Streakin (tanpa dependency eksternal).
 * Menggambar background hijau brand + "nyala api" oranye sederhana + titik putih.
 * Menghasilkan PNG valid via pure-JS encoder (zlib deflate).
 *
 * Jalankan: node scripts/gen-icons.mjs
 * Ganti dengan ikon desain final kapan pun siap.
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

// Palet
const GREEN = [5, 150, 105]; // brand-600
const GREEN_D = [4, 120, 87]; // brand-700 (gradient bawah)
const ORANGE = [249, 115, 22]; // flame-500
const ORANGE_L = [251, 146, 60]; // flame-400
const WHITE = [255, 255, 255];

function makePNG(size, maskable) {
  const cx = size / 2;
  const cy = size / 2;
  // Untuk maskable, jaga elemen di dalam "safe zone" ~80%.
  const pad = maskable ? size * 0.1 : 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter none
    for (let x = 0; x < size; x++) {
      // Background gradient hijau vertikal
      const t = y / size;
      let r = Math.round(GREEN[0] + (GREEN_D[0] - GREEN[0]) * t);
      let g = Math.round(GREEN[1] + (GREEN_D[1] - GREEN[1]) * t);
      let b = Math.round(GREEN[2] + (GREEN_D[2] - GREEN[2]) * t);

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const flameR = (size - pad * 2) * 0.30;

      // "Nyala api": lingkaran oranye dengan puncak meruncing ke atas.
      const teardrop = flameR * (1 + Math.max(0, -dy / size) * 0.6);
      if (dist < teardrop) {
        const it = Math.min(1, dist / teardrop);
        r = Math.round(ORANGE_L[0] + (ORANGE[0] - ORANGE_L[0]) * it);
        g = Math.round(ORANGE_L[1] + (ORANGE[1] - ORANGE_L[1]) * it);
        b = Math.round(ORANGE_L[2] + (ORANGE[2] - ORANGE_L[2]) * it);
      }
      // Titik putih di inti api
      if (dist < flameR * 0.34) {
        r = WHITE[0];
        g = WHITE[1];
        b = WHITE[2];
      }

      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
      raw[p++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
];
for (const [name, size, maskable] of targets) {
  fs.writeFileSync(path.join(OUT, name), makePNG(size, maskable));
  console.log("wrote", name, size + "x" + size);
}
console.log("done");
