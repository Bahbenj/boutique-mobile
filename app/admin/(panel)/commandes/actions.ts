"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { orderStatuses } from "@/lib/admin/orders-shared";
import type { ActionResult } from "@/lib/admin/schema";
import { requireStaff } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

const statusSchema = z.object({ id: z.uuid(), status: z.enum(orderStatuses) });

/**
 * Change le statut d'une commande. Le restockage (annulation) et la reprise
 * du stock (« désannulation ») sont faits par le déclencheur en base.
 * Seule la colonne status est modifiable par l'admin (GRANT, migration 7).
 */
export async function updateOrderStatus(input: { id: string; status: string }): Promise<ActionResult> {
  await requireStaff();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Statut invalide." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("status")
    .maybeSingle();

  if (error) {
    logSupabaseError("changement de statut de commande", error);
    if (error.message.includes("insufficient_stock")) {
      return {
        ok: false,
        error: `Stock insuffisant pour réactiver la commande${error.details ? ` (${error.details})` : ""}. Réapprovisionnez d'abord le produit.`,
      };
    }
    return { ok: false, error: "Statut non enregistré : " + error.message };
  }
  if (!data) return { ok: false, error: "Commande introuvable." };

  updateTag(CATALOG_TAG); // le stock a pu changer (annulation)
  refresh();
  return { ok: true };
}
