import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import StreakCard from "@/components/StreakCard";
import CheckinButton from "@/components/CheckinButton";

export const metadata = { title: "Hari Ini" };
// Selalu render segar supaya status check-in hari ini akurat.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tanggal "hari ini" WIB (selaras dengan logika server do_checkin).
  const todayWib = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  // Ambil semua challenge yang diikuti + join data challenge-nya.
  const { data: parts } = await supabase
    .from("challenge_participants")
    .select(
      "id, current_streak, shields_available, last_checkin_date, challenge:challenges(id, title, category, requires_proof)"
    )
    .eq("user_id", user.id)
    .order("current_streak", { ascending: false });

  const participants = parts ?? [];
  const greeting = getGreeting();
  const displayName =
    (user.user_metadata?.name as string)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "kamu";

  return (
    <AppShell
      title="Hari Ini"
      right={
        <Link href="/profile" className="text-sm font-semibold text-brand-600">
          Profil
        </Link>
      }
    >
      <p className="mb-4 text-slate-500">
        {greeting}, <span className="font-semibold text-slate-800">{displayName}</span> 👋
      </p>

      {participants.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {participants.map((p: any) => {
            const c = p.challenge;
            const checkedInToday = p.last_checkin_date === todayWib;
            return (
              <StreakCard
                key={p.id}
                challengeId={c.id}
                title={c.title}
                category={c.category}
                currentStreak={p.current_streak}
                shields={p.shields_available}
                checkedInToday={checkedInToday}
              >
                {!checkedInToday && (
                  <CheckinButton
                    challengeId={c.id}
                    userId={user.id}
                    requiresProof={c.requires_proof}
                  />
                )}
              </StreakCard>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function getGreeting() {
  const h = Number(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false })
  );
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function EmptyState() {
  return (
    <div className="card items-center py-10 text-center">
      <div className="text-4xl">🌱</div>
      <h2 className="mt-3 text-lg font-bold text-slate-900">Belum ikut challenge apa pun</h2>
      <p className="mt-1 text-sm text-slate-500">
        Mulai dengan bikin challenge sendiri atau ikut yang lagi rame.
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        <Link href="/create" className="btn-primary">
          ➕ Buat Challenge
        </Link>
        <Link href="/explore" className="btn-ghost">
          🧭 Jelajahi Challenge
        </Link>
      </div>
    </div>
  );
}
