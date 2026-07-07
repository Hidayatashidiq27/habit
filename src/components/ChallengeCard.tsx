import Link from "next/link";
import { categoryMeta } from "@/lib/categories";
import type { Category } from "@/lib/types";

/** Kartu challenge di halaman Jelajah (grid/list). */
export default function ChallengeCard({
  id,
  title,
  description,
  category,
  durationDays,
  participantCount,
}: {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  durationDays: number | null;
  participantCount: number;
}) {
  const cat = categoryMeta(category);
  return (
    <Link href={`/challenge/${id}`} className="card block transition hover:ring-brand-200">
      <div className="flex items-center justify-between">
        <span className="chip bg-slate-100 text-slate-600">
          {cat.emoji} {cat.label}
        </span>
        <span className="text-xs font-medium text-slate-400">
          👥 {participantCount}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-1 text-base font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{description}</p>
      )}
      <p className="mt-2 text-xs font-medium text-slate-400">
        {durationDays ? `${durationDays} hari` : "Tanpa batas"}
      </p>
    </Link>
  );
}
