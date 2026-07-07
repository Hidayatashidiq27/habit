import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback: tukar `code` dari Google menjadi sesi Supabase,
 * lalu redirect ke `next` (default "/"). Menangani forwarded host
 * (mis. di belakang proxy/Vercel) agar redirect tetap ke domain yang benar.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) return NextResponse.redirect(`${origin}${next}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Gagal — kembali ke login dengan pesan error ringan.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
