"use client";

import { createClient } from "@/lib/supabase/browser";

/**
 * Photos : compression dans le navigateur (≤ 1600 px, WebP ~82 %) puis envoi
 * direct vers Supabase Storage avec la session admin (politique RLS du bucket).
 * Une photo de 4 Mo prise au téléphone pèse ensuite ~150 à 300 Ko.
 */

const MAX_SIDE = 1600;
const MAX_INPUT = 25 * 1024 * 1024; // refuse les fichiers source démesurés

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.");
  if (file.size > MAX_INPUT) throw new Error("Image trop lourde (25 Mo maximum).");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Format non lu par ce navigateur (HEIC ?). Exportez la photo en JPEG.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Compression impossible sur ce navigateur.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // WebP si le navigateur sait l'encoder, sinon JPEG (anciens Safari)
  let blob = await toBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.85);
  if (!blob) throw new Error("Compression impossible.");
  return blob;
}

/**
 * Compresse puis envoie ; renvoie l'URL publique. `folder` : products | categories
 * (admin), ou reviews/<id du client> (photos d'avis : seul ce client peut y écrire).
 */
export async function uploadImage(file: File, folder: "products" | "categories" | `reviews/${string}`): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from("catalog").upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    if (/row-level security|unauthorized|403/i.test(error.message)) throw new Error("Accès refusé : reconnectez-vous.");
    if (/fetch|network/i.test(error.message)) throw new Error("Connexion impossible. Vérifiez le réseau et réessayez.");
    throw new Error(error.message);
  }
  return supabase.storage.from("catalog").getPublicUrl(path).data.publicUrl;
}
