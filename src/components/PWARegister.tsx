"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker agar PWA installable & mendukung offline/push. */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* abaikan — SW gagal daftar tidak memblokir app */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
