import type { Category } from "./types";

/** Metadata kategori challenge — dipakai untuk chip filter & label. */
export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "kesehatan", label: "Kesehatan", emoji: "💪" },
  { id: "ibadah", label: "Ibadah", emoji: "🕌" },
  { id: "produktivitas", label: "Produktivitas", emoji: "⚡" },
  { id: "belajar", label: "Belajar", emoji: "📚" },
  { id: "keuangan", label: "Keuangan", emoji: "💰" },
  { id: "lainnya", label: "Lainnya", emoji: "✨" },
];

export function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Metadata badge untuk tampilan profil. */
export const BADGES: Record<string, { label: string; emoji: string; desc: string }> = {
  streak_7: { label: "Seminggu Nonstop", emoji: "🔥", desc: "Streak 7 hari" },
  streak_30: { label: "Sebulan Konsisten", emoji: "🏅", desc: "Streak 30 hari" },
  streak_100: { label: "Legenda Streak", emoji: "👑", desc: "Streak 100 hari" },
  total_50: { label: "Rajin", emoji: "⭐", desc: "50 total check-in" },
};

export function badgeMeta(type: string) {
  return BADGES[type] ?? { label: type, emoji: "🎖️", desc: "" };
}
