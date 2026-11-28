#!/usr/bin/env node
// =============================================================================
// Photos du stockage Supabase (bucket « catalog » : produits, catégories, avis).
//
//   node photos.mjs copier <dossier>       copie à l'identique (incrémentale : seuls les
//                                          fichiers nouveaux ou modifiés sont téléchargés ;
//                                          ceux supprimés du stockage sont retirés)
//   node photos.mjs restaurer <dossier>    renvoie tous les fichiers du dossier dans le
//                                          bucket (écrase les fichiers de même nom)
//
// Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (clé secrète), BUCKET (catalog).
// Aucune dépendance : Node 18 ou plus suffit.
// =============================================================================
import { mkdir, readdir, rm, stat, writeFile, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const [mode, dir] = process.argv.slice(2);
const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucket = process.env.BUCKET ?? "catalog";
if (!["copier", "restaurer"].includes(mode) || !dir || !url || !key) {
  console.error("Usage : SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node photos.mjs copier|restaurer <dossier>");
  process.exit(2);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

/** Liste récursive : [{ path, size }] */
async function list(prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`liste ${prefix || "/"} : ${res.status} ${await res.text()}`);
    const items = await res.json();
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...(await list(path))); // dossier
      else if (it.name !== ".emptyFolderPlaceholder") out.push({ path, size: Number(it.metadata?.size ?? -1) });
    }
    if (items.length < 1000) return out;
  }
}

async function walk(root, base = root) {
  const files = [];
  for (const e of await readdir(root, { withFileTypes: true })) {
    const p = join(root, e.name);
    if (e.isDirectory()) files.push(...(await walk(p, base)));
    else files.push(relative(base, p).split(sep).join("/"));
  }
  return files;
}

const types = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", avif: "image/avif", gif: "image/gif", svg: "image/svg+xml" };

if (mode === "copier") {
  const remote = await list();
  await mkdir(dir, { recursive: true });
  let downloaded = 0;
  let kept = 0;
  for (const f of remote) {
    const local = join(dir, ...f.path.split("/"));
    const st = await stat(local).catch(() => null);
    if (st && st.size === f.size) {
      kept++;
      continue;
    }
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${enc(f.path)}`, { headers });
    if (!res.ok) throw new Error(`téléchargement ${f.path} : ${res.status}`);
    await mkdir(dirname(local), { recursive: true });
    await writeFile(local, Buffer.from(await res.arrayBuffer()));
    downloaded++;
  }
  // Fichiers supprimés du stockage : retirés de la copie (les sauvegardes précédentes les gardent)
  const wanted = new Set(remote.map((f) => f.path));
  let removed = 0;
  for (const p of await walk(dir)) {
    if (!wanted.has(p)) {
      await rm(join(dir, ...p.split("/")));
      removed++;
    }
  }
  // Dossiers devenus vides
  const prune = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) if (e.isDirectory()) await prune(join(d, e.name));
    if (d !== dir && (await readdir(d)).length === 0) await rm(d, { recursive: true });
  };
  await prune(dir);
  console.log(`photos : ${remote.length} fichier(s) dans le stockage, ${downloaded} téléchargé(s), ${kept} déjà à jour, ${removed} retiré(s)`);
} else {
  const files = await walk(dir);
  let sent = 0;
  const failed = [];
  for (const p of files) {
    const ext = p.split(".").pop()?.toLowerCase() ?? "";
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${enc(p)}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": types[ext] ?? "application/octet-stream", "x-upsert": "true", "cache-control": "max-age=31536000" },
      body: await readFile(join(dir, ...p.split("/"))),
    });
    // Un fichier refusé n'arrête pas la restauration des autres
    if (res.ok) sent++;
    else failed.push(`${p} (${res.status} ${(await res.text()).slice(0, 120)})`);
  }
  console.log(`photos : ${sent} fichier(s) renvoyé(s) dans le bucket « ${bucket} »`);
  if (failed.length) {
    console.error(`${failed.length} fichier(s) refusé(s) :\n  ${failed.join("\n  ")}`);
    process.exit(1);
  }
}
