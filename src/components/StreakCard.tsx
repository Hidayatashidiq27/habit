import Link from "next/link";
import ShieldBadge from "./ShieldBadge";
import { categoryMeta } from "@/lib/categories";
import type { Category } from "@/lib/types";

interface Props {
  challengeId: string;
  title: string;
  category: Category;
  currentStreak: number;
  shields: number;
  checkedInToday: boolean;
  children?: React.ReactNode; // slot tombol check-in
}

/** Kartu ringkas satu challenge di layar "Hari Ini". */
export default function StreakCard({
  challengeId,
  title,
  category,
  currentStreak,
  shields,
  checkedInToday,
  children,
}: Props) {
  const cat = categoryMeta(category);
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/challenge/${challengeId}`} className="block">
            <p className="chip bg-slate-100 text-slate-600">
              {cat.emoji} {cat.label}
            </p>
            <h3 className="mt-1.5 truncate text-base font-bold text-slate-900">{title}</h3>
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="chip bg-flame-50 text-flame-600">
              🔥 {currentStreak} hari
            </span>
            <ShieldBadge count={shields} />
          </div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
      {checkedInToday && (
        <p className="mt-2 text-center text-sm font-medium text-brand-600">
          ✓ Sudah check-in hari ini. Mantap! 🎉
        </p>
      )}
    </div>
  );
}
