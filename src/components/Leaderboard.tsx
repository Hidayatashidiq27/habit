"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardRow } from "@/lib/types";

/**
 * Leaderboard per-challenge dengan update near-real-time.
 * Berlangganan perubahan tabel challenge_participants via Supabase Realtime,
 * lalu refetch view challenge_leaderboard (sudah terurut + rank).
 *
 * Tab "Mingguan" memakai RPC weekly_leaderboard (jumlah check-in 7 hari terakhir)
 * supaya user baru tidak minder oleh streak lama peserta senior.
 */
export default function Leaderboard({
  challengeId,
  currentUserId,
}: {
  challengeId: string;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<"alltime" | "weekly">("alltime");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("challenge_leaderboard")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("rank", { ascending: true })
      .limit(100);
    setRows((data as LeaderboardRow[]) ?? []);
    const { data: wk } = await supabase.rpc("weekly_leaderboard", {
      p_challenge_id: challengeId,
    });
    setWeekly(wk ?? []);
    setLoading(false);
  }, [challengeId, supabase]);

  useEffect(() => {
    fetchAll();
    // Realtime: refetch saat ada peserta yang check-in / streak berubah.
    const channel = supabase
      .channel(`lb-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_participants",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, fetchAll, supabase]);

  const medal = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setTab("alltime")}
          className={`chip ${tab === "alltime" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          All-time
        </button>
        <button
          onClick={() => setTab("weekly")}
          className={`chip ${tab === "weekly" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Minggu ini
        </button>
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> live
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-slate-400">Memuat…</p>
      ) : tab === "alltime" ? (
        <ul className="space-y-2">
          {rows.map((r) => (
            <Row
              key={r.user_id}
              rank={r.rank}
              medal={medal(r.rank)}
              name={r.nickname || r.name || "Anonim"}
              avatar={r.avatar_url}
              primary={`🔥 ${r.current_streak}`}
              secondary={`${r.total_checkins} check-in`}
              me={r.user_id === currentUserId}
            />
          ))}
          {rows.length === 0 && <Empty />}
        </ul>
      ) : (
        <ul className="space-y-2">
          {weekly.map((r: any) => (
            <Row
              key={r.user_id}
              rank={Number(r.rank)}
              medal={medal(Number(r.rank))}
              name={r.nickname || r.name || "Anonim"}
              avatar={r.avatar_url}
              primary={`✅ ${r.weekly_checkins}`}
              secondary={`streak 🔥${r.current_streak}`}
              me={r.user_id === currentUserId}
            />
          ))}
          {weekly.length === 0 && <Empty />}
        </ul>
      )}
    </div>
  );
}

function Row({
  rank,
  medal,
  name,
  avatar,
  primary,
  secondary,
  me,
}: {
  rank: number;
  medal: string;
  name: string;
  avatar: string | null;
  primary: string;
  secondary: string;
  me: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        me ? "bg-brand-50 ring-1 ring-brand-200" : "bg-white ring-1 ring-slate-100"
      }`}
    >
      <span className="w-7 text-center text-sm font-bold text-slate-500">{medal}</span>
      {avatar ? (
        <Image
          src={avatar}
          alt={name}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
        {name} {me && <span className="text-xs font-normal text-brand-600">(kamu)</span>}
      </span>
      <span className="text-right">
        <span className="block font-bold text-slate-900">{primary}</span>
        <span className="block text-xs text-slate-400">{secondary}</span>
      </span>
    </li>
  );
}

function Empty() {
  return (
    <li className="rounded-xl bg-white py-8 text-center text-slate-400 ring-1 ring-slate-100">
      Belum ada peserta. Jadi yang pertama! 🚀
    </li>
  );
}
