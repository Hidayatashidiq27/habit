import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import CreateForm from "./CreateForm";

export const metadata = { title: "Buat Challenge" };

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell title="Buat Challenge">
      <CreateForm userId={user.id} />
    </AppShell>
  );
}
