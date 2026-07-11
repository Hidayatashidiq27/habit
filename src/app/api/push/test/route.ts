import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/push/webpush";

// Route handler selalu dinamis (POST) — tidak di-prerender.
export const dynamic = "force-dynamic";

/**
 * Kirim notifikasi push TES ke semua device milik user yang sedang login.
 * Dipakai oleh tombol "Kirim notif tes" di halaman Profil.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@streakin.app";
  if (!privateKey || !publicKey) {
    return NextResponse.json(
      { error: "VAPID belum dikonfigurasi di server (set VAPID_PRIVATE_KEY)." },
      { status: 500 }
    );
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "no_subscription" }, { status: 400 });
  }

  const payload = JSON.stringify({
    title: "Streakin 🔥",
    body: "Notifikasi tes berhasil! Reminder check-in bakal muncul seperti ini.",
    url: "/",
    tag: "streakin-test",
  });

  let sent = 0;
  for (const s of subs) {
    try {
      const res = await sendWebPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        payload,
        { publicKey, privateKey, subject }
      );
      if (res.status === 200 || res.status === 201) {
        sent++;
      } else if (res.status === 404 || res.status === 410) {
        // Subscription sudah kadaluarsa — bersihkan.
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
      }
    } catch {
      /* abaikan device yang gagal */
    }
  }

  return NextResponse.json({ sent, total: subs.length });
}
