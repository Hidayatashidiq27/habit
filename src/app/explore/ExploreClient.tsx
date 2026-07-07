"use client";

import { useMemo, useState } from "react";
import ChallengeCard from "@/components/ChallengeCard";
import { CATEGORIES } from "@/lib/categories";

/** Filter kategori + search di sisi klien atas data trending yang sudah di-fetch. */
export default function ExploreClient({ challenges }: { challenges: any[] }) {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      if (cat && c.category !== cat) return false;
      if (q && !`${c.title} ${c.description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [challenges, cat, q]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari challenge…"
        className="input mb-3"
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCat(null)}
          className={`chip whitespace-nowrap ${!cat ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Semua
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`chip whitespace-nowrap ${
              cat === c.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card items-center py-10 text-center text-slate-400">
          Belum ada challenge yang cocok. Coba kategori lain atau buat sendiri! ✨
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ChallengeCard
              key={c.id}
              id={c.id}
              title={c.title}
              description={c.description}
              category={c.category}
              durationDays={c.duration_days}
              participantCount={c.participant_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
