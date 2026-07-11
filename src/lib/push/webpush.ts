/**
 * Web Push sender — kompatibel Cloudflare Workers (pakai Web Crypto, tanpa dependency Node).
 * Implementasi mengikuti:
 *   - RFC 8291 (Message Encryption for Web Push, skema "aes128gcm")
 *   - RFC 8188 (Encrypted Content-Encoding aes128gcm)
 *   - RFC 8292 (VAPID — Voluntary Application Server Identification)
 *
 * Dipakai oleh /api/push/test (dan nanti oleh cron reminder di Tahap 2).
 */

const enc = new TextEncoder();

export interface PushSub {
  endpoint: string;
  p256dh: string; // public key device (base64url)
  auth: string; // auth secret (base64url)
}
export interface Vapid {
  publicKey: string; // base64url, 65 byte uncompressed
  privateKey: string; // base64url, 32 byte scalar
  subject: string; // mailto:... atau https://...
}

/* ---------- util base64url & bytes ---------- */
function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  s += "=".repeat(pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}
/**
 * Salin Uint8Array ke ArrayBuffer eksak-panjang. Web Crypto & fetch mengharapkan
 * BufferSource/ArrayBuffer; ini menghindari mismatch tipe Uint8Array generik (TS 5.7).
 */
function ab(u: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u.length);
  copy.set(u);
  return copy.buffer;
}
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", ab(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, ab(data)));
}
/** HKDF (extract + satu blok expand; cukup karena panjang keluaran <= 32 byte). */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

/**
 * Kirim satu notifikasi push terenkripsi ke satu subscription.
 * Return Response mentah dari push service (cek status: 201 = sukses, 404/410 = expired).
 */
export async function sendWebPush(sub: PushSub, payload: string, vapid: Vapid): Promise<Response> {
  const uaPublic = b64urlToBytes(sub.p256dh); // 65 byte
  const authSecret = b64urlToBytes(sub.auth); // 16 byte

  // Keypair ECDH ephemeral milik server aplikasi
  const asKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )) as CryptoKeyPair;
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey)); // 65

  // ECDH shared secret dengan public key device
  const uaKey = await crypto.subtle.importKey("raw", ab(uaPublic), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeyPair.privateKey, 256)
  ); // 32

  // IKM (RFC 8291): PRK_key = HMAC(auth, ecdh); IKM = HMAC(PRK_key, key_info||0x01)
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublicRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // Content encryption (RFC 8188): PRK = HMAC(salt, IKM); turunkan CEK & NONCE
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  // Plaintext + delimiter 0x02 (record terakhir), lalu AES-128-GCM
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const cekKey = await crypto.subtle.importKey("raw", ab(cek), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: ab(nonce) }, cekKey, ab(plaintext))
  );

  // Header aes128gcm: salt(16) | rs(4=4096) | idlen(1=65) | keyid(as_public 65)
  const rs = new Uint8Array([0, 0, 0x10, 0]);
  const header = concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  const body = concat(header, ciphertext);

  // VAPID JWT (ES256)
  const url = new URL(sub.endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const jwtHeader = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const jwtPayload = bytesToB64url(
    enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject }))
  );
  const signingInput = `${jwtHeader}.${jwtPayload}`;

  const pub = b64urlToBytes(vapid.publicKey); // 65
  const signKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      d: vapid.privateKey,
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signKey, ab(enc.encode(signingInput)))
  );
  const jwt = `${signingInput}.${bytesToB64url(sig)}`;

  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "2419200", // 28 hari
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
    },
    body: ab(body),
  });
}
