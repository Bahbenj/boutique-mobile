"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteProduct, quickUpdateProduct, saveProduct } from "@/app/admin/(panel)/produits/actions";
import { conditionLabels, conditions, fieldErrors, grades, parseAmount, productSchema, slugify, type DbProduct, type ProductInput } from "@/lib/admin/schema";
import { useUI } from "@/lib/ui-store";
import { useMounted } from "@/lib/use-mounted";
import { cn, formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconChevron, IconClose, IconPlus, IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { FormSection, IconButton, Switch } from "../ui";
import { ImageManager } from "./ImageManager";
import { ProductPreview } from "./ProductPreview";
import { HelpTip } from "../HelpTip";

type Row = { key: string; a: string; b: string; c: string };
const row = (a = "", b = "", c = ""): Row => ({ key: Math.random().toString(36).slice(2), a, b, c });
const amountText = (n: number | null | undefined) => (n == null || n === 0 ? "" : formatAmount(n));
/** « 2026-12-24T23:59:59Z » → « 2026-12-24 » (champ date) ; heure du magasin = GMT. */
const dateText = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
const toIso = (d: string, endOfDay = false) => (d ? `${d}T${endOfDay ? "23:59:59" : "00:00:00"}Z` : null);

/** Champs saisis : ce que l'on garde en brouillon et compare pour « modifié ». */
type Draft = {
  name: string;
  slug: string;
  slugTouched: boolean;
  categoryId: string;
  description: string;
  price: string;
  promoPrice: string;
  promoStart: string;
  promoEnd: string;
  stock: string;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  freeDelivery: boolean;
  tag: string;
  brand: string;
  condition: DbProduct["condition"];
  grade: string;
  battery: string;
  highlights: string;
  specs: string;
  imageBg: string | null;
  images: string[];
  colors: Row[];
  storage: Row[];
};

const fromProduct = (p: DbProduct | null): Draft => ({
  name: p?.name ?? "",
  slug: p?.slug ?? "",
  slugTouched: Boolean(p),
  categoryId: p?.category_id ?? "",
  description: p?.description ?? "",
  price: amountText(p?.price),
  promoPrice: amountText(p?.promo_price),
  promoStart: dateText(p?.promo_starts_at),
  promoEnd: dateText(p?.promo_ends_at),
  stock: String(p?.stock ?? 1),
  isActive: p?.is_active ?? true,
  isFeatured: p?.is_featured ?? false,
  isNew: p?.is_new ?? false,
  freeDelivery: p?.free_delivery ?? false,
  tag: p?.tag ?? "",
  brand: p?.brand ?? "",
  condition: p?.condition ?? "neuf",
  grade: p?.grade ?? "",
  battery: p?.battery == null ? "" : String(p.battery),
  highlights: (p?.highlights ?? []).join("\n"),
  specs: (p?.specs ?? []).map(([l, v]) => `${l} : ${v}`).join("\n"),
  imageBg: p?.image_bg ?? null,
  images: p?.images ?? [],
  colors: (p?.variants?.colors ?? []).map((c) => row(c.name, c.hex)),
  storage: (p?.variants?.storage ?? []).map((s) => row(s.label, amountText(s.price), amountText(s.old_price))),
});

/** Libellés des champs, pour le message « Il manque : … ». */
const fieldNames: Record<string, string> = {
  name: "le nom",
  category_id: "la catégorie",
  price: "le prix",
  images: "une photo",
  promo_price: "le prix promo",
  promo_ends_at: "la date de fin de promo",
  slug: "l'adresse de la page",
  stock: "le stock",
};

/**
 * Fiche produit (création / modification). 4 champs obligatoires : nom,
 * catégorie, prix, photo ; tout le reste est facultatif. Validation zod dans
 * le navigateur ET sur le serveur. Brouillon gardé dans le navigateur.
 */
export function ProductForm({
  product,
  categories,
  isCopy = false,
}: {
  product: DbProduct | null;
  categories: { id: string; name: string }[];
  isCopy?: boolean;
}) {
  const router = useRouter();
  const toast = useUI((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [d, setD] = useState<Draft>(() => fromProduct(product));
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const initialImages = useMemo(() => product?.images ?? [], [product]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setD((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !prev.slugTouched) next.slug = slugify(String(value));
      return next;
    });
    setDirty(true);
    if (errors[key as string]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  // --- Brouillon automatique (navigateur) -------------------------------------------
  const draftKey = `admin-brouillon-produit:${product?.id ?? "nouveau"}`;
  const mounted = useMounted();
  const [draftHandled, setDraftHandled] = useState(false);
  // Lu une fois la page affichée dans le navigateur (localStorage n'existe pas côté serveur)
  const savedDraft = useMemo(() => {
    if (!mounted || draftHandled) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { at: string; draft: Draft };
      // Proposé seulement s'il est plus récent que la dernière version enregistrée
      return !product || Date.parse(parsed.at) > Date.parse(product.updated_at) ? parsed : null;
    } catch {
      return null;
    }
  }, [mounted, draftHandled, draftKey, product]);
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ at: new Date().toISOString(), draft: d }));
      } catch {
        // Stockage plein ou désactivé : le brouillon n'est simplement pas gardé
      }
    }, 800);
    return () => clearTimeout(id);
  }, [d, dirty, draftKey]);

  // --- Avertissement si l'on quitte sans enregistrer -------------------------------------
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    // Liens internes de l'admin : la navigation Next.js ne déclenche pas beforeunload
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || !a.href.startsWith(location.origin) || a.href === location.href) return;
      if (!window.confirm("Quitter sans enregistrer ? Vos modifications restent gardées en brouillon sur ce téléphone.")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const hasStorage = d.storage.length > 0;
  const num = (s: string) => parseAmount(s);
  const priceValue = num(d.price);
  const promoValue = num(d.promoPrice);
  const promoPercent =
    priceValue && promoValue != null && !Number.isNaN(promoValue) && promoValue < priceValue ? Math.round((1 - promoValue / priceValue) * 100) : null;

  const buildInput = (): ProductInput => ({
    name: d.name,
    slug: d.slug || slugify(d.name),
    brand: d.brand,
    category_id: d.categoryId as string,
    condition: d.condition,
    grade: d.condition === "neuf" ? null : d.grade || null,
    battery: d.condition === "neuf" || !d.battery ? null : Number(d.battery),
    price: (hasStorage ? num(d.storage[0].b) : priceValue) ?? 0,
    old_price: null,
    promo_price: hasStorage ? null : promoValue,
    promo_starts_at: hasStorage || promoValue == null ? null : toIso(d.promoStart),
    promo_ends_at: hasStorage || promoValue == null ? null : toIso(d.promoEnd, true),
    stock: d.stock === "" ? 0 : Number(d.stock),
    is_new: d.isNew,
    is_featured: d.isFeatured,
    is_active: d.isActive,
    tag: d.tag,
    free_delivery: d.freeDelivery,
    image_bg: d.imageBg,
    description: d.description,
    highlights: d.highlights
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    specs: d.specs
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(":");
        return (i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, "-"]) as [string, string];
      }),
    images: d.images,
    variants: {
      ...(d.colors.length ? { colors: d.colors.map((c) => ({ name: c.a, hex: c.b || "#000000" })) } : {}),
      ...(hasStorage ? { storage: d.storage.map((s) => ({ label: s.a, price: num(s.b) ?? NaN, old_price: num(s.c) })) } : {}),
    },
  });

  const showErrors = (errs: Record<string, string>) => {
    setErrors(errs);
    const missing = [
      ...new Set(
        Object.keys(errs)
          .map((k) => fieldNames[k.split(".")[0]] ?? null)
          .filter(Boolean),
      ),
    ];
    toast({
      title: "Il manque quelque chose",
      text: missing.length ? `À vérifier : ${missing.join(", ")}.` : Object.values(errs)[0],
      tone: "error",
    });
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("[aria-invalid=true], [data-invalid=true]")?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  };

  const submit = () => {
    const input = buildInput();
    const check = productSchema.safeParse(input);
    if (!check.success) return showErrors(fieldErrors(check.error));
    startTransition(async () => {
      const res = await saveProduct(product?.id ?? null, input);
      if (!res.ok) {
        if (res.fields) setErrors(res.fields);
        toast({ title: "Non enregistré", text: res.error, tone: "error" });
        return;
      }
      setErrors({});
      setDirty(false);
      localStorage.removeItem(draftKey);
      if (product) {
        toast({ title: "Modifications enregistrées", text: d.name, image: d.images[0] });
      } else {
        localStorage.removeItem("admin-brouillon-produit:nouveau");
        toast({
          title: "Produit ajouté",
          text: d.isActive ? "Il est en vente sur le site." : "Il est masqué : activez « En vente » quand il est prêt.",
          image: d.images[0],
        });
        router.replace(`/admin/produits/${res.data.id}`);
      }
    });
  };

  const e = (key: string) => errors[key] || undefined;
  const preview = (
    <ProductPreview
      name={d.name}
      brand={d.brand}
      image={d.images[0]}
      imageBg={d.imageBg}
      price={hasStorage ? num(d.storage[0]?.b ?? "") : priceValue}
      promoPrice={hasStorage ? null : promoValue}
      fromPrice={d.storage.length > 1}
      isNew={d.isNew}
      tag={d.tag}
      freeDelivery={d.freeDelivery}
      stock={d.stock === "" ? 0 : Number(d.stock)}
      isActive={d.isActive}
    />
  );

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        submit();
      }}
      noValidate
      className="pb-32 lg:pb-0"
    >
      {isCopy && (
        <p role="status" className="mb-5 rounded-card bg-accent-soft p-4 text-sm">
          <strong>Copie créée et masquée.</strong> Changez le nom, vérifiez les photos et le prix, puis activez « En vente ».
        </p>
      )}
      {savedDraft && (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-card bg-gold-soft p-4 text-sm ring-1 ring-gold/40">
          <p className="me-auto">
            <strong>Brouillon non enregistré</strong> du{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Bamako" }).format(new Date(savedDraft.at))}.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setD(savedDraft.draft);
              setDirty(true);
              setDraftHandled(true);
            }}
          >
            Reprendre
          </Button>
          <Button
            size="sm"
            variant="light"
            onClick={() => {
              localStorage.removeItem(draftKey);
              setDraftHandled(true);
            }}
          >
            Ignorer
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <FormSection title="Photos" description="Obligatoire. La première photo est celle que les clients voient en premier.">
            <ImageManager
              images={d.images}
              setImages={(next) => {
                // Mise à jour fonctionnelle : plusieurs envois en parallèle ne s'écrasent pas
                setD((prev) => ({ ...prev, images: typeof next === "function" ? next(prev.images) : next }));
                setDirty(true);
                if (errors.images) setErrors((er) => ({ ...er, images: "" }));
              }}
              initial={initialImages}
              error={e("images")}
            />
          </FormSection>

          <FormSection title="Ce que le client voit">
            <div className="grid gap-4">
              <Field
                label="Nom du produit *"
                value={d.name}
                onChange={(ev) => set("name", ev.target.value)}
                error={e("name")}
                placeholder="Ex. Casque Bluetooth JBL"
                maxLength={120}
              />
              <SelectField label="Catégorie *" value={d.categoryId} onChange={(ev) => set("categoryId", ev.target.value)} error={e("category_id")}>
                <option value="" disabled>
                  Choisir une catégorie…
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
              <TextareaField
                label="Description (facultatif)"
                value={d.description}
                onChange={(ev) => set("description", ev.target.value)}
                rows={3}
                placeholder="En une ou deux phrases : à quoi sert ce produit, pour qui."
              />
            </div>
          </FormSection>

          <FormSection
            title="Prix et promotion"
            description={hasStorage ? "Ce produit a des capacités : chaque capacité a son prix (voir « Plus d'options »)." : "En francs CFA, sans décimales."}
          >
            {!hasStorage && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Prix *"
                  inputMode="numeric"
                  value={d.price}
                  onChange={(ev) => set("price", ev.target.value)}
                  error={e("price")}
                  placeholder="Ex. 25 000"
                  hint="Prix normal en FCFA."
                />
                <Field
                  label={
                    <>
                      Prix promo (facultatif){" "}
                      <HelpTip label="Aide : prix promo">
                        Le prix pendant la promotion, plus bas que le prix normal. Le site affiche l&apos;ancien prix barré et le pourcentage. Sans dates, la
                        promo dure jusqu&apos;à ce que vous effaciez ce prix.
                      </HelpTip>
                    </>
                  }
                  inputMode="numeric"
                  value={d.promoPrice}
                  onChange={(ev) => set("promoPrice", ev.target.value)}
                  error={e("promo_price")}
                  placeholder="Ex. 20 000"
                  hint={promoPercent != null ? `Soit −${promoPercent} % : le prix normal apparaît barré.` : "Laissez vide s'il n'y a pas de promo."}
                />
                {d.promoPrice && (
                  <>
                    <Field
                      label="Début de la promo"
                      type="date"
                      value={d.promoStart}
                      onChange={(ev) => set("promoStart", ev.target.value)}
                      hint="Vide : tout de suite."
                    />
                    <Field
                      label="Fin de la promo"
                      type="date"
                      value={d.promoEnd}
                      onChange={(ev) => set("promoEnd", ev.target.value)}
                      error={e("promo_ends_at")}
                      hint="Vide : jusqu'à ce que vous l'arrêtiez."
                    />
                  </>
                )}
              </div>
            )}
            <div className="mt-4 grid gap-1 border-t border-line pt-3">
              <span className="flex items-center gap-2">
                <Switch checked={d.freeDelivery} onChange={(v) => set("freeDelivery", v)} label="Livraison offerte avec ce produit" showLabel />
                <HelpTip label="Aide : livraison offerte">
                  Si ce produit est dans le panier, le client ne paie pas la livraison à domicile, pour toute la commande.
                </HelpTip>
              </span>
            </div>
          </FormSection>

          <FormSection title="Stock" description="Nombre d'exemplaires disponibles. À 0, le produit s'affiche « Rupture » et ne peut plus être commandé.">
            <Field
              label="Quantité en stock"
              inputMode="numeric"
              value={d.stock}
              onChange={(ev) => set("stock", ev.target.value.replace(/\D/g, "").slice(0, 6))}
              error={e("stock")}
              className="max-w-48"
            />
          </FormSection>

          <details className="group rounded-card bg-surface shadow-soft" open={Boolean(e("slug") || Object.keys(errors).some((k) => k.startsWith("variants")))}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-lg font-extrabold">Plus d&apos;options</span>
                <span className="block text-sm text-muted">Facultatif : marque, état, caractéristiques, coloris, capacités…</span>
              </span>
              <IconChevron dir="down" size={20} className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-6 border-t border-line p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Marque"
                  value={d.brand}
                  onChange={(ev) => set("brand", ev.target.value)}
                  placeholder="Ex. Samsung"
                  hint="Seulement si le produit est authentique."
                />
                <Field
                  label="Pastille sur la photo"
                  value={d.tag}
                  onChange={(ev) => set("tag", ev.target.value)}
                  placeholder="Ex. Promo, Arrivage"
                  maxLength={24}
                  error={e("tag")}
                  hint="Petit texte doré sur la photo."
                />
                <SelectField label="État" value={d.condition} onChange={(ev) => set("condition", ev.target.value as DbProduct["condition"])}>
                  {conditions.map((c) => (
                    <option key={c} value={c}>
                      {conditionLabels[c]}
                    </option>
                  ))}
                </SelectField>
                {d.condition !== "neuf" && (
                  <>
                    <SelectField label="Aspect" value={d.grade} onChange={(ev) => set("grade", ev.target.value)}>
                      <option value="">Non précisé</option>
                      {grades.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </SelectField>
                    <Field
                      label="Batterie (%)"
                      inputMode="numeric"
                      value={d.battery}
                      onChange={(ev) => set("battery", ev.target.value.replace(/\D/g, "").slice(0, 3))}
                      error={e("battery")}
                    />
                  </>
                )}
              </div>

              <div className="grid gap-1">
                <Switch checked={d.isNew} onChange={(v) => set("isNew", v)} label="Étiquette « Nouveau »" showLabel />
              </div>

              <TextareaField
                label="Points forts (un par ligne)"
                value={d.highlights}
                onChange={(ev) => set("highlights", ev.target.value)}
                rows={3}
                placeholder={"Bluetooth 5.3\n10 h d'autonomie"}
              />
              <TextareaField
                label="Caractéristiques (une par ligne, ex. « Autonomie : 10 h »)"
                value={d.specs}
                onChange={(ev) => set("specs", ev.target.value)}
                rows={4}
                placeholder={"Connexion : Bluetooth 5.3\nAutonomie : 10 h"}
              />

              <div>
                <h3 className="text-sm font-bold">Coloris</h3>
                <p className="text-xs text-muted">Le client choisira son coloris sur la fiche.</p>
                <ul className="mt-2 space-y-2">
                  {d.colors.map((c, i) => (
                    <li key={c.key} className="flex items-center gap-2">
                      <label className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-line">
                        <span className="sr-only">Teinte du coloris {i + 1}</span>
                        <input
                          type="color"
                          value={c.b || "#000000"}
                          onChange={(ev) =>
                            set(
                              "colors",
                              d.colors.map((x) => (x.key === c.key ? { ...x, b: ev.target.value } : x)),
                            )
                          }
                          className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer"
                        />
                      </label>
                      <input
                        aria-label={`Nom du coloris ${i + 1}`}
                        value={c.a}
                        placeholder="Ex. Noir"
                        onChange={(ev) =>
                          set(
                            "colors",
                            d.colors.map((x) => (x.key === c.key ? { ...x, a: ev.target.value } : x)),
                          )
                        }
                        aria-invalid={Boolean(e(`variants.colors.${i}.name`)) || undefined}
                        className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-raised px-4 text-[1rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-danger"
                      />
                      <IconButton
                        label={`Retirer le coloris ${i + 1}`}
                        onClick={() =>
                          set(
                            "colors",
                            d.colors.filter((x) => x.key !== c.key),
                          )
                        }
                      >
                        <IconClose size={16} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" className="mt-2 h-11 ring-1 ring-line" onClick={() => set("colors", [...d.colors, row("", "#1c1c1c")])}>
                  <IconPlus size={16} />
                  Ajouter un coloris
                </Button>
              </div>

              <div>
                <h3 className="text-sm font-bold">Capacités (téléphones)</h3>
                <p className="text-xs text-muted">Chaque capacité a son prix. Le site affiche « dès » le prix de la première.</p>
                <ul className="mt-2 space-y-3">
                  {d.storage.map((s, i) => (
                    <li key={s.key} className="rounded-2xl bg-canvas/60 p-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                        <Field
                          label="Capacité"
                          value={s.a}
                          placeholder="128 Go"
                          onChange={(ev) =>
                            set(
                              "storage",
                              d.storage.map((x) => (x.key === s.key ? { ...x, a: ev.target.value } : x)),
                            )
                          }
                          error={e(`variants.storage.${i}.label`)}
                          className="col-span-2 sm:col-span-1"
                        />
                        <Field
                          label="Prix"
                          inputMode="numeric"
                          value={s.b}
                          onChange={(ev) =>
                            set(
                              "storage",
                              d.storage.map((x) => (x.key === s.key ? { ...x, b: ev.target.value } : x)),
                            )
                          }
                          error={e(`variants.storage.${i}.price`)}
                        />
                        <Field
                          label="Prix barré"
                          inputMode="numeric"
                          value={s.c}
                          onChange={(ev) =>
                            set(
                              "storage",
                              d.storage.map((x) => (x.key === s.key ? { ...x, c: ev.target.value } : x)),
                            )
                          }
                          error={e(`variants.storage.${i}.old_price`)}
                        />
                        <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                          <IconButton
                            label={`Monter la capacité ${i + 1}`}
                            disabled={i === 0}
                            onClick={() => {
                              const next = [...d.storage];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              set("storage", next);
                            }}
                          >
                            <IconChevron dir="up" size={16} />
                          </IconButton>
                          <IconButton
                            label={`Retirer la capacité ${i + 1}`}
                            onClick={() =>
                              set(
                                "storage",
                                d.storage.filter((x) => x.key !== s.key),
                              )
                            }
                          >
                            <IconClose size={16} />
                          </IconButton>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-11 ring-1 ring-line"
                  onClick={() => set("storage", [...d.storage, row("", d.storage.length ? "" : d.price)])}
                >
                  <IconPlus size={16} />
                  Ajouter une capacité
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Adresse de la page"
                  value={d.slug}
                  onChange={(ev) => {
                    setD((prev) => ({ ...prev, slugTouched: true }));
                    set("slug", slugify(ev.target.value) || ev.target.value.toLowerCase());
                  }}
                  error={e("slug")}
                  hint={<>Créée automatiquement : /produit/{d.slug || "…"}</>}
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <div>
                  <span className="flex items-center gap-2">
                    <Switch
                      checked={d.imageBg !== null}
                      onChange={(on) => set("imageBg", on ? "#ffffff" : null)}
                      label="Photo entière (sans recadrage)"
                      showLabel
                    />
                    <HelpTip label="Aide : photo entière">
                      Pour une photo sur fond blanc : elle est montrée en entier sur un fond de couleur, au lieu d&apos;être coupée pour remplir le cadre.
                    </HelpTip>
                  </span>
                  {d.imageBg !== null && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                      Couleur du fond
                      <input
                        type="color"
                        value={d.imageBg}
                        onChange={(ev) => set("imageBg", ev.target.value)}
                        className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-raised"
                      />
                    </label>
                  )}
                  <p className="mt-1 text-xs text-muted">Pour une photo sur fond uni : elle n&apos;est plus coupée sur les vignettes.</p>
                </div>
              </div>
            </div>
          </details>

          {product && (
            <section className="rounded-card bg-surface p-5 shadow-soft sm:p-6">
              <h2 className="text-lg font-extrabold">Retirer ce produit du site</h2>
              <p className="mt-1 text-sm text-muted">Le masquer suffit le plus souvent : il disparaît du site mais reste ici, prêt à être remis en vente.</p>
              <Button variant="light" className="mt-4 h-11" onClick={() => setDeleteOpen(true)}>
                <IconTrash size={16} />
                Masquer ou supprimer…
              </Button>
            </section>
          )}
        </div>

        {/* Colonne de droite (ordinateur) : visibilité, aperçu, enregistrement */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <FormSection title="Visibilité">
            <div className="grid gap-1">
              <span className="flex items-center gap-2">
                <Switch checked={d.isActive} onChange={(v) => set("isActive", v)} label={d.isActive ? "En vente sur le site" : "Masqué du site"} showLabel />
                <HelpTip label="Aide : en vente ou masqué">
                  Masqué : le produit disparaît du site mais reste ici, avec ses photos et son stock. Pratique en rupture ou pour préparer une fiche.
                </HelpTip>
              </span>
              <span className="flex items-center gap-2">
                <Switch checked={d.isFeatured} onChange={(v) => set("isFeatured", v)} label="Mis en avant sur l'accueil" showLabel />
                <HelpTip label="Aide : mise en avant">Le produit apparaît dans « Les plus demandés » sur la page d&apos;accueil (8 produits au plus).</HelpTip>
              </span>
            </div>
          </FormSection>
          <section className="hidden rounded-card bg-surface p-5 shadow-soft lg:block">
            <h2 className="text-sm font-bold text-muted">Comme le client le voit</h2>
            <div className="mt-3">{preview}</div>
          </section>
          <div className="hidden gap-2 lg:grid">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Enregistrement…" : product ? "Enregistrer" : "Ajouter le produit"}
            </Button>
            <p className={cn("text-center text-xs", dirty ? "font-semibold text-fg" : "text-muted")}>
              {dirty ? "Modifications non enregistrées (gardées en brouillon)" : "Tout est enregistré"}
            </p>
            <Link href="/admin/produits" className="py-2 text-center text-sm font-semibold text-muted hover:text-fg">
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile : barre d'enregistrement fixée au-dessus des onglets */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-canvas/95 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="light" className="h-11 px-4" onClick={() => setPreviewOpen(true)}>
            Aperçu
          </Button>
          <p className={cn("min-w-0 flex-1 text-xs leading-tight", dirty ? "font-semibold text-fg" : "text-muted")}>
            {dirty ? "Non enregistré" : "Enregistré"}
          </p>
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "Enregistrement…" : product ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Comme le client le voit">
        <div className="mx-auto max-w-[16rem]">{preview}</div>
      </Modal>

      {product && <DeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} product={product} onHidden={() => set("isActive", false)} />}
    </form>
  );
}

/** Retrait d'un produit : « Masquer » proposé d'abord ; suppression définitive après confirmation. */
function DeleteDialog({ open, onClose, product, onHidden }: { open: boolean; onClose: () => void; product: DbProduct; onHidden: () => void }) {
  const router = useRouter();
  const toast = useUI((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={`Retirer « ${product.name} » ?`}>
      <p className="text-[0.9375rem] text-muted">
        <strong className="text-fg">Masquer</strong> retire le produit du site, sans rien perdre : vous pourrez le remettre en vente en un geste.
      </p>
      <Button
        className="mt-4 w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await quickUpdateProduct({ id: product.id, is_active: false });
            if (!res.ok) return toast({ title: "Non masqué", text: res.error, tone: "error" });
            onHidden();
            onClose();
            toast({ title: "Produit masqué", text: "Il n'apparaît plus sur le site." });
          })
        }
      >
        Masquer le produit
      </Button>

      <div className="mt-6 border-t border-line pt-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--danger)]" />
          <span>Je veux le supprimer définitivement, avec ses photos. Les commandes passées gardent leur copie.</span>
        </label>
        <Button
          variant="light"
          className="mt-3 w-full text-danger ring-1 ring-danger/40"
          disabled={!confirm || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteProduct(product.id);
              if (!res.ok) return toast({ title: "Suppression impossible", text: res.error, tone: "error" });
              localStorage.removeItem(`admin-brouillon-produit:${product.id}`);
              toast({ title: "Produit supprimé", text: product.name });
              router.replace("/admin/produits");
            })
          }
        >
          Supprimer définitivement
        </Button>
      </div>
    </Modal>
  );
}
