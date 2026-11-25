"use server";

import { refresh, updateTag } from "next/cache";
import { fieldErrors, type ActionResult } from "@/lib/admin/schema";
import { reviewSchema, type ReviewInput } from "@/lib/admin/settings-schema";
import { requireAdmin } from "@/lib/auth";
import { REVIEWS_TAG } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

/** Avis clients : création, modification, publication, suppression. */

const UUID = /^[0-9a-f-]{36}$/i;

function done() {
  updateTag(REVIEWS_TAG); // section « Avis » de l'accueil
  refresh();
}

export async function saveReview(input: ReviewInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("reviews").update(data).eq("id", id)
    : await supabase.from("reviews").insert(data); // position 0 : les nouveaux avis passent en tête
  if (error) return { ok: false, error: "Enregistrement impossible : " + error.message };
  done();
  return { ok: true };
}

export async function setReviewPublished(id: string, published: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Avis introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").update({ is_published: published }).eq("id", id);
  if (error) return { ok: false, error: "Modification impossible : " + error.message };
  done();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Avis introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: "Suppression impossible : " + error.message };
  done();
  return { ok: true };
}
