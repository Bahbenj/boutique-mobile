import "server-only";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActivityEntry = {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: "ajout" | "modification" | "suppression";
  entity: string;
  entity_id: string | null;
  label: string | null;
  changes: Record<string, [unknown, unknown]> | null;
};

/** Journal d'activité (propriétaire seul, migration 21) : 300 dernières actions, filtre par personne. */
export async function listActivity(actor?: string) {
  await requireOwner();
  const supabase = await createClient();
  let query = supabase.from("activity_log").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(300);
  if (actor) query = query.eq("actor_email", actor);
  const [{ data, error }, people] = await Promise.all([
    query,
    supabase.from("activity_log").select("actor_email").not("actor_email", "is", null).order("created_at", { ascending: false }).limit(2000),
  ]);
  if (error) return { ready: false, entries: [] as ActivityEntry[], actors: [] as string[] };
  return {
    ready: true,
    entries: (data ?? []) as ActivityEntry[],
    actors: [...new Set((people.data ?? []).map((p) => p.actor_email as string))],
  };
}
