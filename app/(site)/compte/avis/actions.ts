"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requestKey } from "@/lib/request-key";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Avis produits côté client : écrire, modifier, supprimer le sien (session du
 * client, RLS et GRANT par colonne : jamais le statut), signaler un avis abusif.
 * La base revérifie tout (déclencheur product_review_guard, migration 24).
 */

export type ReviewResult = { ok: true; notice: string } | { ok: false; error: string; fields?: Record<string, string> };

const PHOTO = /^https:\/\/[^\s]+\/storage\/v1\/object\/public\/catalog\/reviews\/[0-9a-f-]{36}\/[\w-]+\.(webp|jpg)$/;

const reviewSchema = z.object({
  product_id: z.uuid(),
  rating: z.number({ error: "Choisissez une note de 1 à 5 étoiles." }).int().min(1, "Choisissez une note de 1 à 5 étoiles.").max(5),
  title: z.string().trim().max(80, "80 caractères maximum."),
  body: z.string().trim().min(10, "Écrivez au moins 10 caractères.").max(600, "600 caractères maximum."),
  recommends: z.boolean(),
  photos: z.array(z.string().regex(PHOTO, "Photo non valide.")).max(3, "3 photos au plus."),
});

/** Retire toute balise HTML (la base le refait de toute façon). */
const clean = (s: string) => s.replace(/<[^>]*>/g, "").trim();

const messages: Record<string, string> = {
  too_many_reviews: "Vous avez déjà publié plusieurs avis cette heure-ci. Réessayez un peu plus tard.",
  invalid_photo: "Une photo n'a pas été acceptée. Retirez-la et réessayez.",
  review_too_short: "Écrivez au moins 10 caractères.",
};

export async function saveProductReview(input: z.input<typeof reviewSchema>): Promise<ReviewResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Les avis ne sont pas disponibles pour le moment." };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Vérifiez les champs signalés.", fields };
  }
  const d = { ...parsed.data, title: clean(parsed.data.title), body: clean(parsed.data.body) };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { ok: false, error: "Connectez-vous pour donner votre avis." };
  // Les photos doivent venir du dossier de CE client
  if (d.photos.some((p) => !p.includes(`/reviews/${auth.claims.sub}/`))) return { ok: false, error: messages.invalid_photo };

  const { data: existing } = await supabase.rpc("my_product_reviews");
  const mine = ((existing ?? []) as { id: string; product_id: string }[]).find((r) => r.product_id === d.product_id);
  const { error } = mine
    ? await supabase.from("product_reviews").update({ rating: d.rating, title: d.title, body: d.body, recommends: d.recommends, photos: d.photos }).eq("id", mine.id)
    : await supabase.from("product_reviews").insert(d);
  if (error) {
    const code = Object.keys(messages).find((k) => error.message.includes(k));
    if (code) return { ok: false, error: messages[code] };
    logSupabaseError("avis produit", error);
    return { ok: false, error: "Votre avis n'a pas été enregistré. Réessayez." };
  }
  refresh();
  return { ok: true, notice: "Merci ! Votre avis sera publié après une rapide relecture par la boutique." };
}

export async function deleteProductReview(id: string): Promise<ReviewResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Avis introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_reviews").delete().eq("id", id).select("id"); // RLS : le sien seulement
  if (error || !data?.length) return { ok: false, error: "Suppression impossible." };
  refresh();
  return { ok: true, notice: "Avis supprimé." };
}

/** Signalement d'un avis publié par un visiteur (10 par heure et par appareil, une fois par avis). */
export async function reportProductReview(id: string): Promise<ReviewResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Avis introuvable." };
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "Signalement indisponible pour le moment." };
  const key = await requestKey("avis-signalement");
  if (!key) return { ok: true, notice: "Merci, la boutique va relire cet avis." };
  const service = createServiceClient();
  const { data: allowed } = await service.rpc("rate_limit_allowed", { p_bucket: "report", p_client: key, p_max: 10 });
  if (allowed === false) return { ok: false, error: "Trop de signalements depuis cet appareil. Réessayez plus tard." };
  await service.rpc("rate_limit_hit", { p_bucket: "report", p_client: key });
  const { error } = await service.rpc("report_product_review", { p_id: id, p_client: key });
  if (error) logSupabaseError("signalement d'avis", error);
  return { ok: true, notice: "Merci, la boutique va relire cet avis." };
}
