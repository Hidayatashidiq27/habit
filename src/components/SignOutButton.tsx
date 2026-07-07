"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={signOut} className="btn-ghost w-full text-slate-500">
      Keluar
    </button>
  );
}
