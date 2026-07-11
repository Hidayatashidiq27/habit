"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Ubah VAPID public key (base64url) menjadi ArrayBuffer untuk applicationServerKey. */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return buf;
}

type State =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "default"
  | "subscribed"
  | "denied";

/**
 * Kartu "Pengingat Check-in" — mengelola izin & langganan Web Push.
 * - Aktifkan: minta izin notifikasi → subscribe → simpan ke tabel push_subscriptions (RLS: milik sendiri).
 * - Kirim notif tes: panggil /api/push/test.
 * - Matikan: unsubscribe + hapus dari DB.
 *
 * Catatan iOS: push hanya jalan bila PWA sudah "Add to Home Screen" (iOS 16.4+).
 */
export default function EnableReminders({ userId }: { userId: string }) {
  const supabase = createClient();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (!supported) {
      setState(isIos && !standalone ? "ios-needs-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "default");
    } catch {
      setState("default");
    }
  }

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        setMsg("Izin notifikasi belum diberikan.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMsg("VAPID public key belum diset.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(key),
      });
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setState("subscribed");
      setMsg("Pengingat aktif! 🔔");
    } catch (e: any) {
      setMsg("Gagal mengaktifkan: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("default");
      setMsg("Pengingat dimatikan.");
    } catch (e: any) {
      setMsg("Gagal: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.sent > 0) {
        setMsg("Notif tes terkirim! Cek notifikasi HP-mu 📲");
      } else if (data.error === "no_subscription") {
        setMsg("Aktifkan pengingat dulu ya.");
      } else {
        setMsg("Gagal kirim: " + (data.error || res.status));
      }
    } catch (e: any) {
      setMsg("Gagal: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <p className="font-bold text-slate-800">Pengingat Check-in</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Dapat notifikasi saat waktunya check-in biar streak-mu aman.
          </p>

          <div className="mt-3">
            {state === "loading" && <p className="text-sm text-slate-400">Memeriksa…</p>}

            {state === "unsupported" && (
              <p className="text-sm text-slate-400">
                Browser ini belum mendukung notifikasi. Coba pakai Chrome (Android) atau pasang
                sebagai app.
              </p>
            )}

            {state === "ios-needs-install" && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                📲 Di iPhone, pasang dulu ke layar utama: tombol <b>Bagikan</b> → <b>Add to Home
                Screen</b>, lalu buka Streakin dari ikonnya untuk mengaktifkan pengingat.
              </p>
            )}

            {state === "denied" && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                Notifikasi diblokir. Aktifkan lewat setelan situs di browser, lalu muat ulang.
              </p>
            )}

            {state === "default" && (
              <button onClick={enable} disabled={busy} className="btn-primary w-full">
                {busy ? "Memproses…" : "🔔 Aktifkan Pengingat"}
              </button>
            )}

            {state === "subscribed" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-brand-600">✓ Pengingat aktif</p>
                <div className="flex gap-2">
                  <button onClick={test} disabled={busy} className="btn-flame flex-1 py-2 text-sm">
                    Kirim notif tes
                  </button>
                  <button onClick={disable} disabled={busy} className="btn-ghost py-2 text-sm">
                    Matikan
                  </button>
                </div>
              </div>
            )}

            {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
