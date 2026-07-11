import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ActivityGrid from "@/components/ActivityGrid";
import EnableReminders from "@/components/EnableReminders";
import SignOutButton from "@/components/SignOutButton";
import { badgeMeta } from "@/lib/categories";

export const metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: parts } = await supabase
    .from("challenge_participants")
    .select("id, current_streak, total_checkins, challenge:challenges(id, title, category)")
    .eq("user_id", user.id)
    .order("current_streak", { ascending: false });

  const participants = parts ?? [];
  const participantIds = participants.map((p: any) => p.id);

  // Semua tanggal check-in user (untuk activity grid) — batasi ~130 hari terakhir.
  let checkinDates: string[] = [];
  if (participantIds.length) {
    const since = new Date();
    since.setDate(since.getDate() - 130);
    const { data: checkins } = await supabase
      .from("checkins")
      .select("checkin_date")
      .in("participant_id", participantIds)
      .gte("checkin_date", since.toLocaleDateString("en-CA"));
    checkinDates = (checkins ?? []).map((c: any) => c.checkin_date);
  }

  const { data: badges } = await supabase
    .from("badges")
    .select("badge_type, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  const totalLifetime = participants.reduce((s: number, p: any) => s + p.total_checkins, 0);
  const bestStreak = participants.reduce((m: number, p: any) => Math.max(m, p.current_streak), 0);
  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  return (
    <AppShell title="Profil">
      {/* Kartu identitas */}
      <div className="card flex items-center gap-4">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.name ?? "Avatar"}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl">
            {(profile?.name ?? "U").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold text-slate-900">
            {profile?.nickname || profile?.name || "Pengguna"}
          </h2>
          <p className="truncate text-sm text-slate-400">{profile?.email}</p>
          {isPremium && (
            <span className="chip mt-1 bg-flame-50 text-flame-600">⭐ Premium</span>
          )}
        </div>
      </div>

      {/* Statistik ringkas */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat value={bestStreak} label="Streak terbaik" emoji="🔥" />
        <Stat value={totalLifetime} label="Total check-in" emoji="✅" />
        <Stat value={badges?.length ?? 0} label="Badge" emoji="🏅" />
      </div>

      {/* Activity grid */}
      <div className="card mt-3">
        <p className="label">Aktivitas Check-in</p>
        <ActivityGrid dates={checkinDates} />
      </div>

      {/* Badges */}
      <div className="card mt-3">
        <p className="label">Badge & Achievement</p>
        {badges && badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((b: any, i: number) => {
              const m = badgeMeta(b.badge_type);
              return (
                <span key={i} className="chip bg-slate-100 text-slate-700" title={m.desc}>
                  {m.emoji} {m.label}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Belum ada badge. Check-in konsisten untuk dapat badge pertamamu! 🎯
          </p>
        )}
      </div>

      {/* Challenge yang diikuti */}
      <div className="card mt-3">
        <p className="label">Challenge Diikuti ({participants.length})</p>
        {participants.length ? (
          <ul className="divide-y divide-slate-100">
            {participants.map((p: any) => (
              <li key={p.id}>
                <Link
                  href={`/challenge/${p.challenge.id}`}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="truncate font-medium text-slate-700">{p.challenge.title}</span>
                  <span className="chip bg-flame-50 text-flame-600">🔥 {p.current_streak}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Belum ikut challenge apa pun.</p>
        )}
      </div>

      {/* Pengingat check-in (Web Push) */}
      <div className="mt-3">
        <EnableReminders userId={user.id} />
      </div>

      <div className="mt-4">
        <SignOutButton />
      </div>
    </AppShell>
  );
}

function Stat({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  return (
    <div className="card items-center py-3 text-center">
      <div className="text-xl">{emoji}</div>
      <div className="mt-0.5 text-xl font-extrabold text-slate-900">{value}</div>
      <div className="text-[11px] leading-tight text-slate-400">{label}</div>
    </div>
  );
}
