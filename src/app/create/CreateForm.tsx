"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/types";

const DURATIONS = [
  { label: "7 hari", value: 7 },
  { label: "14 hari", value: 14 },
  { label: "30 hari", value: 30 },
  { label: "Tanpa batas", value: 0 },
];

/**
 * Form buat challenge. Setelah tersimpan, creator otomatis join challenge-nya
 * sendiri, lalu diarahkan ke halaman detail (di sana ada link undangan WhatsApp).
 */
export default function CreateForm({ userId }: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("kesehatan");
  const [duration, setDuration] = useState(30);
  const [targetTime, setTargetTime] = useState("");
  const [requiresProof, setRequiresProof] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul challenge wajib diisi ya.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: insErr } = await supabase
        .from("challenges")
        .insert({
          creator_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          category,
          duration_days: duration === 0 ? null : duration,
          target_time: targetTime || null,
          requires_proof: requiresProof,
          is_private: isPrivate,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Creator langsung join challenge-nya sendiri.
      await supabase.rpc("join_challenge", { p_challenge_id: data.id, p_invite_code: null });

      router.push(`/challenge/${data.id}?created=1`);
    } catch (err: any) {
      setError(err.message || "Gagal membuat challenge.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Judul challenge</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Contoh: "Baca buku 15 menit"'
          maxLength={80}
        />
      </div>

      <div>
        <label className="label">Deskripsi singkat (opsional)</label>
        <textarea
          className="input min-h-[80px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Aturan main atau motivasi buat peserta…"
          maxLength={280}
        />
      </div>

      <div>
        <label className="label">Kategori</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`chip ${category === c.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Durasi target</label>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              type="button"
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={`rounded-xl py-2 text-sm font-semibold ${
                duration === d.value
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Jam target check-in (opsional)</label>
        <input
          type="time"
          className="input"
          value={targetTime}
          onChange={(e) => setTargetTime(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          Mis. 06:00 untuk habit subuh — dipakai untuk pengingat pintar.
        </p>
      </div>

      <Toggle
        label="Wajib foto bukti tiap check-in"
        desc="Peserta harus upload foto saat check-in."
        checked={requiresProof}
        onChange={setRequiresProof}
      />
      <Toggle
        label="Challenge privat (invite only)"
        desc="Hanya bisa diikuti lewat link/kode undangan."
        checked={isPrivate}
        onChange={setIsPrivate}
      />

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
        {loading ? "Membuat…" : "🚀 Buat & Bagikan"}
      </button>
    </form>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="card flex w-full items-center justify-between text-left"
    >
      <div className="pr-3">
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
