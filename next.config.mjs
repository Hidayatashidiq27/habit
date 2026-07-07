/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Avatar Google + foto bukti dari Supabase Storage
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Service worker & manifest disajikan dari /public, tidak butuh config khusus.
};

export default nextConfig;

// Mengaktifkan akses binding Cloudflare saat `next dev` (dev-only, tidak memengaruhi build).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
