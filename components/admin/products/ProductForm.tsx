"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveProduct } from "@/app/admin/(panel)/produits/actions";
import {
  conditionLabels,
  conditions,
  fieldErrors,
  grades,
  parseAmount,
  productSchema,
  slugify,
  type DbProduct,
  type ProductInput,
} from "@/lib/admin/schema";
import { cn } from "@/lib/utils";
import { useUI } from "@/lib/ui-store";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconChevron, IconClose, IconPlus } from "@/components/ui/icons";
import { FormSection, IconButton, Switch } from "../ui";
import { ImageManager } from "./ImageManager";

type Row = { key: string; a: string; b: string; c: string };
const row = (a = "", b = "", c = ""): Row => ({ key: Math.random().toString(36).slice(2), a, b, c });
const amountText = (n: number | null | undefined) => (n == null ? "" : String(n));

/** Formulaire produit (création / modification). Validation zod côté client ET serveur. */
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

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [condition, setCondition] = useState<DbProduct["condition"]>(product?.condition ?? "neuf");
  const [grade, setGrade] = useState(product?.grade ?? "");
  const [battery, setBattery] = useState(amountText(product?.battery));
  const [price, setPrice] = useState(amountText(product?.price));
  const [oldPrice, setOldPrice] = useState(amountText(product?.old_price));
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isNew, setIsNew] = useState(product?.is_new ?? false);
  const [description, setDescription] = useState(product?.description ?? "");
  const [highlights, setHighlights] = useState((product?.highlights ?? []).join("\n"));
  const [specs, setSpecs] = useState((product?.specs ?? []).map(([l, v]) => `${l} : ${v}`).join("\n"));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [colors, setColors] = useState<Row[]>((product?.variants?.colors ?? []).map((c) => row(c.name, c.hex)));
  const [storage, setStorage] = useState<Row[]>(
    (product?.variants?.storage ?? []).map((s) => row(s.label, amountText(s.price), amountText(s.old_price))),
  );
  const initialImages = useMemo(() => product?.images ?? [], [product]);

  // --- Modifications non enregistrées : avertit avant de quitter la page ---
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const touch =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setDirty(true);
    };

  const hasStorage = storage.length > 0;
  const num = (s: string) => {
    const v = parseAmount(s);
    return v === null ? null : v;
  };

  const buildInput = (): ProductInput => ({
    name,
    slug,
    brand,
    category_id: categoryId || null,
    condition,
    grade: condition === "neuf" ? null : grade || null,
    battery: condition === "neuf" || !battery ? null : Number(battery),
    price: (hasStorage ? num(storage[0].b) : num(price)) ?? NaN,
    old_price: hasStorage ? null : num(oldPrice),
    stock: stock === "" ? NaN : Number(stock),
    is_new: isNew,
    is_featured: isFeatured,
    is_active: isActive,
    description,
    highlights: highlights.split("\n").map((l) => l.trim()).filter(Boolean),
    specs: specs
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(":");
        return (i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, "-"]) as [string, string];
      }),
    images,
    variants: {
      ...(colors.length ? { colors: colors.map((c) => ({ name: c.a, hex: c.b || "#000000" })) } : {}),
      ...(hasStorage ? { storage: storage.map((s) => ({ label: s.a, price: num(s.b) ?? NaN, old_price: num(s.c) })) } : {}),
    },
  });

  const submit = () => {
    const input = buildInput();
    const check = productSchema.safeParse(input);
    if (!check.success) {
      const errs = fieldErrors(check.error);
      setErrors(errs);
      toast({ title: "Formulaire incomplet", text: Object.values(errs)[0] });
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    startTransition(async () => {
      const res = await saveProduct(product?.id ?? null, input);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Non enregistré", text: res.error });
        return;
      }
      setErrors({});
      setDirty(false);
      if (product) {
        toast({ title: "Modifications enregistrées", text: name });
      } else {
        toast({ title: "Produit créé", text: name });
        router.replace(`/admin/produits/${res.data.id}`);
      }
    });
  };

  const e = (key: string) => errors[key];

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        submit();
      }}
      noValidate
      className="pb-24 lg:pb-0"
    >
      {isCopy && (
        <p role="status" className="mb-5 rounded-card bg-accent-soft p-4 text-sm">
          <strong>Copie créée, hors ligne.</strong> Vérifiez le nom, le lien et les photos, puis mettez-la en ligne.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <FormSection title="Photos">
            <ImageManager images={images} setImages={touch(setImages) as typeof setImages} initial={initialImages} error={e("images")} />
          </FormSection>

          <FormSection title="Informations">
            <div className="grid gap-4">
              <Field
                label="Nom du produit"
                value={name}
                onChange={(ev) => {
                  touch(setName)(ev.target.value);
                  if (!slugTouched) setSlug(slugify(ev.target.value));
                }}
                error={e("name")}
                placeholder="iPhone 15 Pro"
                required
              />
              <Field
                label="Lien de la page"
                value={slug}
                onChange={(ev) => {
                  setSlugTouched(true);
                  touch(setSlug)(slugify(ev.target.value) || ev.target.value.toLowerCase());
                }}
                error={e("slug")}
                hint={<>Adresse : /produit/{slug || "…"}</>}
                autoCapitalize="off"
                spellCheck={false}
              />
              <TextareaField label="Description" value={description} onChange={(ev) => touch(setDescription)(ev.target.value)} rows={4} />
            </div>
          </FormSection>

          <FormSection
            title="Prix et stock"
            description={hasStorage ? "Le prix affiché « dès » est celui de la première capacité." : "Montants en dinars (DT)."}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {!hasStorage && (
                <>
                  <Field label="Prix (DT)" inputMode="decimal" value={price} onChange={(ev) => touch(setPrice)(ev.target.value)} error={e("price")} required />
                  <Field
                    label="Ancien prix (DT)"
                    inputMode="decimal"
                    value={oldPrice}
                    onChange={(ev) => touch(setOldPrice)(ev.target.value)}
                    error={e("old_price")}
                    hint="Affiche « Promo −X % »"
                  />
                </>
              )}
              <Field label="Stock" inputMode="numeric" value={stock} onChange={(ev) => touch(setStock)(ev.target.value.replace(/\D/g, ""))} error={e("stock")} hint="0 = rupture" />
            </div>
          </FormSection>

          <FormSection title="Variantes" description="Facultatif. Le client choisira sur la fiche produit.">
            <h3 className="text-sm font-bold">Couleurs</h3>
            <ul className="mt-2 space-y-2">
              {colors.map((c, i) => (
                <li key={c.key} className="flex items-center gap-2">
                  <label className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-line">
                    <span className="sr-only">Teinte de la couleur {i + 1}</span>
                    <input
                      type="color"
                      value={c.b || "#000000"}
                      onChange={(ev) => touch(setColors)(colors.map((x) => (x.key === c.key ? { ...x, b: ev.target.value } : x)))}
                      className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer"
                    />
                  </label>
                  <input
                    aria-label={`Nom de la couleur ${i + 1}`}
                    value={c.a}
                    placeholder="Titane noir"
                    onChange={(ev) => touch(setColors)(colors.map((x) => (x.key === c.key ? { ...x, a: ev.target.value } : x)))}
                    aria-invalid={Boolean(e(`variants.colors.${i}.name`)) || undefined}
                    className="h-11 min-w-0 flex-1 rounded-2xl border border-line px-4 text-[1rem] outline-none focus:border-ink focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-red-600"
                  />
                  <IconButton label={`Retirer la couleur ${i + 1}`} onClick={() => touch(setColors)(colors.filter((x) => x.key !== c.key))}>
                    <IconClose size={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2 ring-1 ring-line" onClick={() => touch(setColors)([...colors, row("", "#1c1c1c")])}>
              <IconPlus size={16} />
              Ajouter une couleur
            </Button>

            <h3 className="mt-6 text-sm font-bold">Capacités</h3>
            <ul className="mt-2 space-y-3">
              {storage.map((s, i) => (
                <li key={s.key} className="rounded-2xl bg-cream/60 p-3">
                  <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                    <Field
                      label="Capacité"
                      value={s.a}
                      placeholder="128 Go"
                      onChange={(ev) => touch(setStorage)(storage.map((x) => (x.key === s.key ? { ...x, a: ev.target.value } : x)))}
                      error={e(`variants.storage.${i}.label`)}
                      className="col-span-2 sm:col-span-1"
                    />
                    <Field
                      label="Prix (DT)"
                      inputMode="decimal"
                      value={s.b}
                      onChange={(ev) => touch(setStorage)(storage.map((x) => (x.key === s.key ? { ...x, b: ev.target.value } : x)))}
                      error={e(`variants.storage.${i}.price`)}
                    />
                    <Field
                      label="Ancien prix"
                      inputMode="decimal"
                      value={s.c}
                      onChange={(ev) => touch(setStorage)(storage.map((x) => (x.key === s.key ? { ...x, c: ev.target.value } : x)))}
                      error={e(`variants.storage.${i}.old_price`)}
                    />
                    <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                      <IconButton
                        label={`Monter la capacité ${i + 1}`}
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...storage];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          touch(setStorage)(next);
                        }}
                      >
                        <IconChevron dir="up" size={16} />
                      </IconButton>
                      <IconButton label={`Retirer la capacité ${i + 1}`} onClick={() => touch(setStorage)(storage.filter((x) => x.key !== s.key))}>
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
              className="mt-2 ring-1 ring-line"
              onClick={() => touch(setStorage)([...storage, row("", storage.length ? "" : price, storage.length ? "" : oldPrice)])}
            >
              <IconPlus size={16} />
              Ajouter une capacité
            </Button>
          </FormSection>

          <FormSection title="Détails" description="Affichés sur la fiche produit.">
            <div className="grid gap-4">
              <TextareaField
                label="Points forts (un par ligne)"
                value={highlights}
                onChange={(ev) => touch(setHighlights)(ev.target.value)}
                rows={4}
                placeholder={"Puce A17 Pro\nChâssis en titane"}
              />
              <TextareaField
                label="Caractéristiques (« Libellé : valeur », une par ligne)"
                value={specs}
                onChange={(ev) => touch(setSpecs)(ev.target.value)}
                rows={6}
                placeholder={"Écran : 6,1″ OLED\nGarantie : 12 mois"}
              />
            </div>
          </FormSection>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <FormSection title="Visibilité">
            <div className="grid gap-1">
              <Switch checked={isActive} onChange={touch(setIsActive)} label="En ligne sur le site" showLabel />
              <Switch checked={isFeatured} onChange={touch(setIsFeatured)} label="Vedette (page d'accueil)" showLabel />
              <Switch checked={isNew} onChange={touch(setIsNew)} label="Badge « Nouveau »" showLabel />
            </div>
          </FormSection>

          <FormSection title="Organisation">
            <div className="grid gap-4">
              <SelectField label="Catégorie" value={categoryId} onChange={(ev) => touch(setCategoryId)(ev.target.value)} error={e("category_id")}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
              <Field label="Marque" value={brand} onChange={(ev) => touch(setBrand)(ev.target.value)} placeholder="Apple" error={e("brand")} />
              <SelectField label="État" value={condition} onChange={(ev) => touch(setCondition)(ev.target.value as DbProduct["condition"])}>
                {conditions.map((c) => (
                  <option key={c} value={c}>
                    {conditionLabels[c]}
                  </option>
                ))}
              </SelectField>
              {condition !== "neuf" && (
                <>
                  <SelectField label="État esthétique" value={grade} onChange={(ev) => touch(setGrade)(ev.target.value)}>
                    <option value="">Non précisé</option>
                    {grades.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </SelectField>
                  <Field
                    label="Santé batterie (%)"
                    inputMode="numeric"
                    value={battery}
                    onChange={(ev) => touch(setBattery)(ev.target.value.replace(/\D/g, "").slice(0, 3))}
                    error={e("battery")}
                  />
                </>
              )}
            </div>
          </FormSection>

          {/* Desktop : actions dans la colonne */}
          <div className="hidden gap-2 lg:grid">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Enregistrement…" : product ? "Enregistrer" : "Créer le produit"}
            </Button>
            <Link href="/admin/produits" className="py-2 text-center text-sm font-semibold text-muted hover:text-ink">
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile : barre d'enregistrement fixée au-dessus des onglets */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <p className={cn("flex-1 text-xs", dirty ? "font-semibold text-ink" : "text-muted")}>{dirty ? "Modifications non enregistrées" : "À jour"}</p>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : product ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>
    </form>
  );
}
