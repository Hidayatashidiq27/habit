"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Tombol "Ikut Challenge" — sekali tap memanggil RPC join_challenge. */
export default function JoinButton({
  challengeId,
  inviteCode,
}: {
  challengeId?: string;
  inviteCode?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("join_challenge", {
      p_challenge_id: challengeId ?? null,
      p_invite_code: inviteCode ?? null,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push("/");
  }

  return (
    <div>
      <button onClick={join} disabled={loading} className="btn-primary w-full py-4 text-base">
        {loading ? "Bergabung…" : "🙌 Ikut Challenge"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
