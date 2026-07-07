"use client";

import { useEffect, useState } from "react";

/**
 * Dorong user untuk "Add to Home Screen".
 * - Android/Chrome: tangkap event `beforeinstallprompt` lalu tampilkan tombol Install.
 * - iOS/Safari: tampilkan instruksi manual (Share → Add to Home Screen), karena
 *   iOS tidak menyediakan prompt otomatis. Web Push di iOS baru jalan setelah
 *   PWA di-install (iOS 16.4+), jadi ini penting untuk onboarding.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Sudah berjalan sebagai PWA standalone? Jangan tampilkan.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    if (localStorage.getItem("streakin_install_dismissed") === "1") {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Deteksi iOS Safari (tanpa prompt otomatis)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome/.test(ua);
    if (isIos && isSafari) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const close = () => {
    setDismissed(true);
    localStorage.setItem("streakin_install_dismissed", "1");
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  };

  if (dismissed) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
      <div className="card flex items-start gap-3 border border-brand-100">
        <div className="text-2xl">📲</div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800">Pasang Streakin di HP-mu</p>
          {deferred ? (
            <p className="mt-0.5 text-sm text-slate-500">
              Tap ikon di layar utama seperti aplikasi biasa — plus dapat pengingat check-in.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-500">
              Tap tombol <span className="font-semibold">Bagikan</span> di Safari, lalu pilih{" "}
              <span className="font-semibold">“Add to Home Screen”</span>.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {deferred && (
              <button onClick={install} className="btn-primary px-3 py-2 text-sm">
                Pasang Sekarang
              </button>
            )}
            <button onClick={close} className="btn-ghost px-3 py-2 text-sm">
              Nanti aja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
