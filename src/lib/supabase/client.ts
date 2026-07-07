"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk komponen browser ("use client").
 * Memakai anon key yang aman diekspos ke publik (dibatasi RLS).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
