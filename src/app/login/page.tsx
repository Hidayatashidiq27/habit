import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export const metadata = { title: "Masuk" };

/** Halaman login. Jika sudah login, langsung diarahkan ke tujuan. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next || "/");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-brand-500 to-brand-700 text-4xl shadow-card">
          🔥
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Streakin</h1>
        <p className="mt-2 max-w-xs text-slate-500">
          Jaga konsistensi habit bareng teman. Check-in tiap hari, jaga streak,
          naik leaderboard. <span className="font-semibold text-slate-700">Kamu nggak sendirian.</span>
        </p>

        <div className="mt-8 grid w-full grid-cols-3 gap-2 text-center">
          <Mini emoji="🎯" label="Bikin challenge" />
          <Mini emoji="🔥" label="Jaga streak" />
          <Mini emoji="🏆" label="Naik peringkat" />
        </div>
      </div>

      <div className="space-y-3">
        <GoogleLoginButton next={next || "/"} />
        <p className="text-center text-xs text-slate-400">
          Dengan masuk, kamu setuju dengan Ketentuan & Kebijakan Privasi Streakin.
        </p>
      </div>
    </div>
  );
}

function Mini({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="card items-center py-3 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
