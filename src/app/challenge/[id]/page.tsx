import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Leaderboard from "@/components/Leaderboard";
import JoinButton from "@/components/JoinButton";
import CheckinButton from "@/components/CheckinButton";
import ShareButton from "@/components/ShareButton";
import ShieldBadge from "@/components/ShieldBadge";
import { categoryMeta } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function ChallengeDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/challenge/${id}`);

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();
  if (!challenge) notFound();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("*")
    .eq("challenge_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const cat = categoryMeta(challenge.category);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const inviteUrl = `${siteUrl}/join/${challenge.invite_code}`;
  const todayWib = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const checkedInToday = participant?.last_checkin_date === todayWib;

  return (
    <AppShell
      title="Challenge"
      right={
        <Link href="/" className="text-sm font-semibold text-brand-600">
          Beranda
        </Link>
      }
    >
      {/* Header challenge */}
      <div className="card">
        <div className="flex items-center gap-2">
          <span className="chip bg-slate-100 text-slate-600">
            {cat.emoji} {cat.label}
          </span>
          {challenge.is_private && (
            <span className="chip bg-slate-100 text-slate-500">🔒 Privat</span>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {challenge.duration_days ? `${challenge.duration_days} hari` : "Tanpa batas"}
          </span>
        </div>
        <h2 className="mt-2 text-xl font-extrabold text-slate-900">{challenge.title}</h2>
        {challenge.description && (
          <p className="mt-1 text-sm text-slate-500">{challenge.description}</p>
        )}
        {challenge.target_time && (
          <p className="mt-2 text-sm text-slate-400">⏰ Target check-in: {challenge.target_time.slice(0, 5)}</p>
        )}

        {/* Status peserta / aksi */}
        <div className="mt-4">
          {participant ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="chip bg-flame-50 text-flame-600">🔥 {participant.current_streak} hari</span>
                <ShieldBadge count={participant.shields_available} />
                <span className="chip bg-slate-100 text-slate-500">
                  {participant.total_checkins} check-in
                </span>
              </div>
              {checkedInToday ? (
                <p className="rounded-xl bg-brand-50 py-3 text-center text-sm font-semibold text-brand-700">
                  ✓ Sudah check-in hari ini 🎉
                </p>
              ) : (
                <CheckinButton
                  challengeId={challenge.id}
                  userId={user.id}
                  requiresProof={challenge.requires_proof}
                />
              )}
            </>
          ) : (
            <JoinButton challengeId={challenge.id} />
          )}
        </div>
      </div>

      {/* Undang teman */}
      {participant && (
        <div className="card mt-3">
          <p className="label">Undang teman</p>
          <div className="mb-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
              {inviteUrl}
            </code>
          </div>
          <ShareButton
            text={`Yuk ikut challenge "${challenge.title}" di Streakin! Jaga konsistensi bareng 🔥`}
            url={inviteUrl}
            label="Ajak lewat WhatsApp"
          />
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-4">
        <h3 className="mb-2 px-1 text-base font-extrabold text-slate-900">🏆 Leaderboard</h3>
        <Leaderboard challengeId={challenge.id} currentUserId={user.id} />
      </div>
    </AppShell>
  );
}
