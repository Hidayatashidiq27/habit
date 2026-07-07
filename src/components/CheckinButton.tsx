"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CheckinResult } from "@/lib/types";

interface Props {
  challengeId: string;
  userId: string;
  requiresProof: boolean;
  disabled?: boolean; // sudah check-in hari ini
}

/**
 * Tombol check-in besar (satu tap). Bila challenge butuh bukti, user pilih foto
 * dulu → diupload ke Supabase Storage → URL disimpan bersama check-in.
 * Memanggil RPC do_checkin yang menangani streak + shield secara atomik.
 */
export default function CheckinButton({ challengeId, userId, requiresProof, disabled }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function handleCheckin() {
    if (disabled || loading) return;
    setLoading(true);
    setMsg(null);
    try {
      let proofUrl: string | null = null;

      if (requiresProof) {
        if (!file) {
          setMsg("Upload foto bukti dulu ya 📸");
          setLoading(false);
          return;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${challengeId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("proofs").upload(path, file);
        if (upErr) throw upErr;
        proofUrl = supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
      }

      const { data, error } = await supabase.rpc("do_checkin", {
        p_challenge_id: challengeId,
        p_proof_url: proofUrl,
      });
      if (error) throw error;

      const res = data as CheckinResult;
      if (res.status === "already") {
        setMsg("Kamu sudah check-in hari ini 👍");
      } else if (res.status === "shield") {
        setMsg(`🛡️ Shield kepakai! Streak aman di ${res.current_streak} hari.`);
      } else if (res.status === "reset") {
        setMsg(`Streak mulai lagi dari 1. Gpp, yang penting balik lagi! 💪`);
      } else {
        setMsg(`🔥 Streak ${res.current_streak} hari! Gas terus!`);
      }
      router.refresh();
    } catch (e: any) {
      setMsg(e.message || "Gagal check-in, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {requiresProof && !disabled && (
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0
                     file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700"
        />
      )}
      <button
        onClick={handleCheckin}
        disabled={disabled || loading}
        className={`w-full py-4 text-lg ${disabled ? "btn-ghost" : "btn-primary"}`}
      >
        {disabled ? "✓ Sudah Check-in" : loading ? "Menyimpan…" : "✅ Check-in Sekarang"}
      </button>
      {msg && <p className="text-center text-sm font-medium text-slate-600">{msg}</p>}
    </div>
  );
}
