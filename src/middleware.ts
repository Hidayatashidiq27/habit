import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Jalankan di semua route kecuali aset statis, ikon, service worker & manifest.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.png$).*)",
  ],
};
