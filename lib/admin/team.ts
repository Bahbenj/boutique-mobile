import "server-only";
import { requireOwner, type StaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TeamMember = { userId: string; email: string; role: StaffRole; createdAt: string; lastSignIn: string | null; isMe: boolean };

/** Équipe (propriétaire seul) : owner_team, migration 20. */
export async function listTeam(): Promise<{ ok: true; members: TeamMember[] } | { ok: false }> {
  await requireOwner();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_team");
  if (error) return { ok: false };
  return {
    ok: true,
    members: ((data ?? []) as Record<string, unknown>[]).map((m) => ({
      userId: String(m.user_id),
      email: String(m.email ?? ""),
      role: m.role as StaffRole,
      createdAt: String(m.created_at),
      lastSignIn: (m.last_sign_in_at as string | null) ?? null,
      isMe: m.is_me === true,
    })),
  };
}
