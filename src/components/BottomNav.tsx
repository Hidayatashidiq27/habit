"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Hari Ini", icon: "🏠" },
  { href: "/explore", label: "Jelajah", icon: "🧭" },
  { href: "/create", label: "Buat", icon: "➕" },
  { href: "/profile", label: "Profil", icon: "👤" },
];

/** Navigasi bawah mobile-first (fixed) — tetap terlihat di semua halaman utama. */
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                active ? "text-brand-600" : "text-slate-400"
              }`}
            >
              <span className="text-xl leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
