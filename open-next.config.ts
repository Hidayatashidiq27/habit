import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Konfigurasi OpenNext untuk Cloudflare Workers.
 * Default sudah cukup untuk Streakin (SSR + middleware, tanpa ISR cache khusus).
 * Bila nanti butuh incremental cache, tambahkan R2/KV di sini.
 */
export default defineCloudflareConfig();
