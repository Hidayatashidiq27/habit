import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import JoinButton from "@/components/JoinButton";
import { categoryMeta } from "@/lib/categories";

export const dynamic = "force-dynamic";

/** Halaman undangan: buka lewat link WhatsApp `/join/<kode>`. */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/join/${code}`);

  // Preview via RPC (bekerja juga untuk challenge privat).
  const { data } = await supabase.rpc("challenge_preview", { p_invite_code: code });
  const challenge = data?.[0];

  if (!challenge) {
    return (
      <AppShell title="Undangan">
        <div className="card items-center py-10 text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-3 font-semibold text-slate-800">Undangan tidak valid</p>
          <p className="mt-1 text-sm text-slate-500">Link mungkin salah atau challenge sudah dihapus.</p>
        </div>
      </AppShell>
    );
  }

  // Sudah jadi peserta? Langsung ke detail.
  const { data: existing } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", challenge.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/challenge/${challenge.id}`);

  const cat = categoryMeta(challenge.category);
  return (
    <AppShell title="Kamu Diundang! 🎉">
      <div className="card text-center">
        <span className="chip mx-auto bg-slate-100 text-slate-600">
          {cat.emoji} {cat.label}
        </span>
        <h2 className="mt-3 text-xl font-extrabold text-slate-900">{challenge.title}</h2>
        {challenge.description && (
          <p className="mt-1 text-sm text-slate-500">{challenge.description}</p>
        )}
        <p className="mt-3 text-sm text-slate-400">
          👥 {challenge.participant_count} peserta ·{" "}
          {challenge.duration_days ? `${challenge.duration_days} hari` : "Tanpa batas"}
        </p>
        <div className="mt-5">
          <JoinButton inviteCode={code} />
        </div>
      </div>
    </AppShell>
  );
}
