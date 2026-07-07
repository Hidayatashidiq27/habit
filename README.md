# 🔥 Streakin

**Social habit-challenge & leaderboard PWA** untuk pasar Indonesia.
Bikin challenge habit, check-in tiap hari, jaga **streak**, dan naik **leaderboard** bareng teman. Tone-nya: _"aku nggak sendirian jaga konsistensi"_ — bukan app hukuman.

Dibangun sebagai **Progressive Web App (PWA)** — bisa "Add to Home Screen" di Android & iOS, tanpa Play Store / App Store (jadi tanpa potongan 30%).

---

## ✨ Fitur yang sudah jadi (MVP inti)

| Fitur | Status |
|---|---|
| Login Google (OAuth via Supabase) | ✅ |
| Buat challenge (judul bebas, kategori, durasi, jam target, privat/publik, wajib foto) | ✅ |
| Jelajah challenge publik trending + filter kategori + search | ✅ |
| Join challenge (tombol / link undangan WhatsApp `/join/<kode>`) | ✅ |
| Check-in harian (satu tap, opsional upload foto bukti) | ✅ |
| **Streak + Grace period + Shield** (1 gratis/bln, 3 utk premium) | ✅ |
| Leaderboard per-challenge **realtime** (all-time & mingguan) | ✅ |
| Profil: statistik, badge, **activity grid** ala GitHub | ✅ |
| Share progres/undangan ke WhatsApp (Web Share API) | ✅ |
| PWA installable (manifest + service worker + offline) | ✅ |
| Skema DB + RLS + index leaderboard | ✅ |

**Belum / scaffold untuk fase berikutnya:** push notification reminder pintar (endpoint + tabel `push_subscriptions` sudah ada, tinggal cron + VAPID), integrasi payment Midtrans/Xendit & fitur premium. Lihat [Roadmap](#-roadmap).

---

## 🧠 Mekanik Streak (penting)

Streak **tidak** langsung reset ke 0 kalau lupa sehari — riset gamification menunjukkan streak "all-or-nothing" mempercepat churn user loyal. Sistemnya:

1. **Grace + Shield** — tiap peserta punya kuota **shield** (perisai). Kalau ada hari bolong, shield otomatis menutupinya dan streak tetap lanjut. Kuota di-refill tiap bulan: **1 gratis**, **3 untuk premium**.
2. Kalau shield habis dan tetap tidak check-in → streak reset ke 1, **TAPI** total check-in lifetime & badge **tidak hilang**.
3. Status shield selalu tampil jelas (ikon 🛡️ di kartu) — transparan, bukan _gotcha_.

Seluruh logika ini berjalan **atomik di database** lewat fungsi `do_checkin()` (lihat `supabase/schema.sql`), memakai zona waktu **Asia/Jakarta** untuk menentukan "hari".

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 18 + TypeScript + Tailwind CSS — mobile-first, PWA.
- **Backend/DB:** Supabase (Postgres + Auth + Realtime + Storage).
- **Auth:** Google OAuth (Supabase Auth).
- **Hosting:** Vercel / Netlify + custom domain (rekomendasi).

---

## 🚀 Setup Lokal

### 1. Prasyarat
- Node.js 18+ dan npm
- Akun [Supabase](https://supabase.com) (gratis) + [Google Cloud Console](https://console.cloud.google.com) untuk OAuth

### 2. Install
```bash
npm install
cp .env.example .env.local   # lalu isi nilai aslinya (lihat langkah 4)
```

### 3. Setup Supabase
1. Buat project baru di Supabase.
2. Buka **SQL Editor** → tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Ini membuat semua tabel, index, RLS, fungsi RPC (`do_checkin`, `join_challenge`, dll), view leaderboard, dan bucket Storage `proofs`.
3. Ambil `Project URL` & `anon key` di **Project Settings → API**.

### 4. Setup Google OAuth
1. Di **Google Cloud Console** → buat OAuth 2.0 Client (Web application).
2. **Authorized redirect URI:** isi dengan callback Supabase:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Di **Supabase → Authentication → Providers → Google:** aktifkan, isi Client ID & Secret.
4. Di **Supabase → Authentication → URL Configuration:** set **Site URL** ke domain kamu (mis. `http://localhost:3000` saat lokal, `https://domainanda.com` saat produksi) dan tambahkan `.../auth/callback` ke **Redirect URLs**.

### 5. Isi `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Jalankan
```bash
npm run dev      # http://localhost:3000
```

> **Ikon PWA:** placeholder sudah di-generate ke `public/icons/`. Untuk mengganti dengan desain final, timpa file PNG-nya atau edit lalu jalankan `node scripts/gen-icons.mjs`.

---

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── page.tsx              # "Hari Ini" — daftar check-in + tombol check-in
│   ├── login/                # Login Google
│   ├── auth/callback/        # OAuth callback (tukar code → sesi)
│   ├── explore/              # Jelajah challenge publik + filter
│   ├── create/               # Form buat challenge
│   ├── challenge/[id]/       # Detail + leaderboard + share
│   ├── join/[code]/          # Halaman undangan (invite link)
│   ├── profile/              # Profil, badge, activity grid
│   └── offline/              # Fallback offline (service worker)
├── components/               # StreakCard, CheckinButton, Leaderboard (realtime), dll
├── lib/
│   ├── supabase/             # client / server / middleware helpers (@supabase/ssr)
│   ├── types.ts              # tipe domain
│   └── categories.ts         # metadata kategori & badge
└── middleware.ts             # refresh sesi Supabase tiap request

supabase/schema.sql           # SKEMA LENGKAP: tabel, index, RLS, RPC, view, storage
public/
├── manifest.json             # PWA manifest (installable)
├── sw.js                     # service worker (offline + push handler)
└── icons/                    # ikon PWA
```

---

## ☁️ Deploy ke Produksi

### Opsi A — Cloudflare Workers (via OpenNext) ⭐

App ini sudah dikonfigurasi untuk Cloudflare Workers memakai adapter
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (dukung SSR +
middleware + Node runtime). File terkait: `wrangler.jsonc`, `open-next.config.ts`.

```bash
# 1. Login ke akun Cloudflare (sekali, interaktif)
npx wrangler login

# 2. Build + deploy
npm run cf:deploy
```

Deploy pertama menghasilkan URL `https://streakin.<akun>.workers.dev`.

**Setelah deploy pertama:**
1. Update `NEXT_PUBLIC_SITE_URL` di `wrangler.jsonc` → URL workers.dev asli kamu (untuk metadata/OG). Link undangan sudah otomatis benar dari header request, jadi tidak wajib rebuild untuk itu.
2. **Supabase → Auth → URL Configuration:** tambahkan URL workers.dev ke **Site URL** dan **Redirect URLs** (`https://<url>/auth/callback`).
3. Google OAuth redirect URI tetap ke callback Supabase (tidak berubah).

**Preview lokal di runtime Workers (workerd):**
```bash
npm run cf:preview     # build + jalankan via wrangler dev
```

**Custom domain:** Cloudflare Dashboard → Workers → project `streakin` → Settings → Domains & Routes → tambahkan domain kamu. Lalu update Site URL/Redirect di Supabase.

> **Catatan env saat build:** `NEXT_PUBLIC_*` di-inline saat `next build`. Nilai publik (URL & anon key Supabase) sudah ditaruh di `wrangler.jsonc > vars` dan juga terbaca dari `.env.local` saat build lokal. Untuk **secret** (mis. `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`) gunakan `npx wrangler secret put NAMA` — jangan taruh di `wrangler.jsonc`.

### Opsi B — Vercel + custom domain

1. Push repo ke GitHub, import ke **Vercel**.
2. Set environment variables di Vercel (sama seperti `.env.local`, ganti `NEXT_PUBLIC_SITE_URL` ke domain produksi).
3. Tambahkan **custom domain** di Vercel, arahkan DNS domain kamu.
4. Update **Supabase → Auth → URL Configuration** dengan domain produksi (Site URL + Redirect URLs) dan Google OAuth redirect.

---

## 🗺️ Roadmap (fase berikutnya)

Urutan pengerjaan mengikuti brief produk:

- [ ] **Push notification reminder pintar** — generate VAPID (`npx web-push generate-vapid-keys`), simpan subscription ke tabel `push_subscriptions` (sudah ada), buat cron (Supabase Edge Function / Vercel Cron) yang kirim reminder — lebih awal di akhir pekan yang rawan lupa.
- [ ] **Notifikasi perubahan peringkat leaderboard** (tabel `notifications` sudah ada).
- [ ] **Share streak card sebagai gambar** (render canvas → WA Status/IG Story).
- [ ] **Payment Midtrans/Xendit** (QRIS, GoPay, OVO, DANA, ShopeePay, VA) + tier premium (shield lebih banyak, challenge privat unlimited, statistik lanjutan). Env sudah disiapkan di `.env.example`.
- [ ] **Rewarded video ads** untuk shield tambahan (tier gratis).

---

## 🔒 Keamanan

- Semua tabel pakai **Row Level Security (RLS)**. User hanya bisa baca/tulis datanya sendiri; challenge privat tidak bocor ke non-anggota.
- Logika streak/shield & join berjalan lewat fungsi `SECURITY DEFINER` yang tervalidasi — tidak bisa dimanipulasi dari klien.
- `anon key` aman diekspos (dibatasi RLS). **Jangan** pernah commit `service_role key` — hanya untuk server/cron.
