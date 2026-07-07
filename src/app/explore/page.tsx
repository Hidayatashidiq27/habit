import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ExploreClient from "./ExploreClient";

export const metadata = { title: "Jelajah" };
export const dynamic = "force-dynamic";

/** Halaman Jelajah: daftar challenge publik trending + filter kategori + search. */
export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("trending_challenges")
    .select("*")
    .order("participant_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AppShell title="Jelajah Challenge">
      <ExploreClient challenges={data ?? []} />
    </AppShell>
  );
}
