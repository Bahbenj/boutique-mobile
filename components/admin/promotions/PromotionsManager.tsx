"use client";

import { useState, useTransition, type ReactNode } from "react";
import { deletePromoCode, deletePromotion, savePromoCode, savePromotion, setPromoCodeActive, setPromotionActive } from "@/app/admin/(panel)/promotions/actions";
import { promoCodeSchema, promoStatus, promotionSchema, type DbPromoCode, type DbPromotion } from "@/lib/admin/promo-schema";
import { fieldErrors, parseAmount } from "@/lib/admin/schema";
import { discounted, discountLabel, type DiscountKind } from "@/lib/promo-shared";
import { useUI } from "@/lib/ui-store";
import { cn, formatAmount, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { IconPencil, IconPlus, IconTag, IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { HelpTip } from "../HelpTip";
import { ConfirmDialog, IconButton, Switch } from "../ui";

type Option = { id: string; name: string };
type ProductOption = Option & { price: number };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const day = (iso: string) => dateFmt.format(new Date(iso));
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
/** Dates du formulaire (heure de Bamako = UTC) : début à 0 h, fin à 23 h 59. */
const toIso = (d: string, endOfDay = false) => (d ? `${d}T${endOfDay ? "23:59:59" : "00:00:00"}Z` : null);

function period(starts: string | null, ends: string | null) {
  if (starts && ends) return `Du ${day(starts)} au ${day(ends)}`;
  if (starts) return `À partir du ${day(starts)}`;
  if (ends) return `Jusqu'au ${day(ends)} inclus`;
  return "Sans date de fin";
}

function StatusPill({ tone, children }: { tone: "on" | "soon" | "off"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "on" && "bg-success/15 text-success",
        tone === "soon" && "bg-accent-soft text-fg ring-1 ring-accent/40",
        tone === "off" && "bg-canvas text-muted ring-1 ring-fg/15",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Page Promotions : remises appliquées automatiquement sur le site (un produit,
 * une catégorie ou toute la boutique) et codes promo que le client saisit dans
 * son panier. Toutes les remises sont recalculées en base à la commande.
 */
export function PromotionsManager({
  promotions,
  codes,
  categories,
  products,
  now,
}: {
  promotions: DbPromotion[];
  codes: DbPromoCode[];
  categories: Option[];
  products: ProductOption[];
  now: number;
}) {
  const toast = useUI((s) => s.showToast);
  const [editPromo, setEditPromo] = useState<DbPromotion | "new" | null>(null);
  const [editCode, setEditCode] = useState<DbPromoCode | "new" | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: "promo" | "code"; id: string; label: string } | null>(null);
  const [pending, start] = useTransition();
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const prodName = new Map(products.map((p) => [p.id, p.name]));

  const target = (p: DbPromotion) =>
    p.scope === "all"
      ? "toute la boutique"
      : p.scope === "category"
        ? `la catégorie ${catName.get(p.category_id ?? "") ?? "?"}`
        : (prodName.get(p.product_id ?? "") ?? "un produit");

  const toggle = (kind: "promo" | "code", id: string, value: boolean, label: string) =>
    start(async () => {
      const res = kind === "promo" ? await setPromotionActive(id, value) : await setPromoCodeActive(id, value);
      if (!res.ok) return toast({ title: "Pas enregistré", text: res.error, tone: "error" });
      toast({
        title: value ? (kind === "promo" ? "Promotion activée" : "Code activé") : kind === "promo" ? "Promotion désactivée" : "Code désactivé",
        text: label,
        action: { label: "Annuler", onClick: () => toggle(kind, id, !value, label) },
      });
    });

  return (
    <div className="space-y-10">
      {/* --- Promotions automatiques ------------------------------------------------- */}
      <section aria-labelledby="titre-promos">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <h2 id="titre-promos" className="text-xl font-extrabold">
              Promotions sur le site
            </h2>
            <p className="mt-1 text-sm text-muted">
              Le prix baisse tout seul pendant les dates choisies, l&apos;ancien prix apparaît barré. Si plusieurs remises existent, le client a la meilleure.
            </p>
          </div>
          <Button onClick={() => setEditPromo("new")} className="max-sm:w-full">
            <IconPlus size={18} />
            Nouvelle promotion
          </Button>
        </div>
        {promotions.length === 0 ? (
          <Empty title="Aucune promotion pour l'instant." text="Exemple : −10 % sur toute la boutique pour la Tabaski, ou −5 000 FCFA sur un téléphone." />
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
            {promotions.map((p) => {
              const st = promoStatus(p, now);
              return (
                <li key={p.id} className="rounded-card bg-surface p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold text-sm font-extrabold text-on-gold">
                      {p.kind === "percent" ? `${p.value}%` : <IconTag size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold">{p.name}</span>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </p>
                      <p className="mt-0.5 text-sm">
                        <strong>{discountLabel(p.kind, p.value)}</strong> sur {target(p)}
                      </p>
                      <p className="text-xs text-muted">{period(p.starts_at, p.ends_at)}</p>
                    </div>
                  </div>
                  <Actions
                    active={p.is_active}
                    onToggle={(v) => toggle("promo", p.id, v, p.name)}
                    onEdit={() => setEditPromo(p)}
                    onDelete={() => setToDelete({ kind: "promo", id: p.id, label: p.name })}
                    name={p.name}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --- Codes promo ----------------------------------------------------------- */}
      <section aria-labelledby="titre-codes">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <h2 id="titre-codes" className="text-xl font-extrabold">
              Codes promo
            </h2>
            <p className="mt-1 text-sm text-muted">Le client tape le code dans son panier. Partagez-le sur WhatsApp, Facebook ou en boutique.</p>
          </div>
          <Button onClick={() => setEditCode("new")} className="max-sm:w-full">
            <IconPlus size={18} />
            Nouveau code
          </Button>
        </div>
        {codes.length === 0 ? (
          <Empty title="Aucun code promo pour l'instant." text="Exemple : BIENVENUE10, −10 % dès 20 000 FCFA d'achat, utilisable 50 fois." />
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
            {codes.map((c) => {
              const st = promoStatus({ is_active: c.is_active, ends_at: c.expires_at }, now);
              const usedUp = c.max_uses != null && c.uses >= c.max_uses;
              return (
                <li key={c.id} className="rounded-card bg-surface p-4 shadow-soft">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="rounded-xl border border-dashed border-gold px-3 py-1 font-mono text-lg font-bold tracking-wider text-gold-text">
                      {c.code}
                    </span>
                    <StatusPill tone={usedUp ? "off" : st.tone}>
                      {usedUp ? "Épuisé" : st.label === "Terminée" ? "Expiré" : st.label === "Désactivée" ? "Désactivé" : "Actif"}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-sm">
                    <strong>{discountLabel(c.kind, c.value)}</strong>
                    {c.min_order > 0 ? ` dès ${formatPrice(c.min_order)} d'achat` : " sur la commande"}
                  </p>
                  <p className="text-xs text-muted">
                    {c.max_uses != null ? `${c.uses} utilisation${c.uses > 1 ? "s" : ""} sur ${c.max_uses}` : `${c.uses} utilisation${c.uses > 1 ? "s" : ""}`}
                    {" · "}
                    {c.expires_at ? `jusqu'au ${day(c.expires_at)} inclus` : "sans date de fin"}
                  </p>
                  <Actions
                    active={c.is_active}
                    onToggle={(v) => toggle("code", c.id, v, c.code)}
                    onEdit={() => setEditCode(c)}
                    onDelete={() => setToDelete({ kind: "code", id: c.id, label: c.code })}
                    name={c.code}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={editPromo !== null}
        onClose={() => setEditPromo(null)}
        title={editPromo === "new" ? "Nouvelle promotion" : "Modifier la promotion"}
        className="max-w-lg"
      >
        {editPromo !== null && (
          <PromotionForm promo={editPromo === "new" ? null : editPromo} categories={categories} products={products} onDone={() => setEditPromo(null)} />
        )}
      </Modal>
      <Modal
        open={editCode !== null}
        onClose={() => setEditCode(null)}
        title={editCode === "new" ? "Nouveau code promo" : "Modifier le code"}
        className="max-w-lg"
      >
        {editCode !== null && <CodeForm code={editCode === "new" ? null : editCode} onDone={() => setEditCode(null)} />}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete?.kind === "code" ? "Supprimer ce code ?" : "Supprimer cette promotion ?"}
        confirmLabel="Supprimer"
        pending={pending}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          start(async () => {
            if (!toDelete) return;
            const res = toDelete.kind === "code" ? await deletePromoCode(toDelete.id) : await deletePromotion(toDelete.id);
            toast(res.ok ? { title: "Supprimé", text: toDelete.label } : { title: "Suppression impossible", text: res.error, tone: "error" });
            setToDelete(null);
          })
        }
      >
        <p>
          <strong className="text-fg">{toDelete?.label}</strong> sera supprimé définitivement.{" "}
          {toDelete?.kind === "code" ? "Les commandes déjà passées gardent leur remise." : "Les prix reviennent à la normale sur le site."} Pour une pause,
          utilisez plutôt l&apos;interrupteur.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-card bg-surface p-6 text-center shadow-soft">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

function Actions({
  active,
  onToggle,
  onEdit,
  onDelete,
  name,
}: {
  active: boolean;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  name: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
      <Switch checked={active} onChange={onToggle} label={active ? "Activé" : "Désactivé"} showLabel />
      <span className="flex items-center">
        <IconButton label={`Modifier ${name}`} onClick={onEdit} className="size-11">
          <IconPencil size={18} />
        </IconButton>
        <IconButton label={`Supprimer ${name}`} tone="danger" onClick={onDelete} className="size-11">
          <IconTrash size={18} />
        </IconButton>
      </span>
    </div>
  );
}

// --- Champ « remise » : % ou FCFA ------------------------------------------------------

function DiscountField({
  kind,
  value,
  onKind,
  onValue,
  error,
}: {
  kind: DiscountKind;
  value: string;
  onKind: (k: DiscountKind) => void;
  onValue: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold">Remise *</legend>
      <div className="flex gap-2">
        <div role="radiogroup" aria-label="Type de remise" className="flex shrink-0 rounded-full bg-raised p-1 ring-1 ring-line">
          {(["percent", "amount"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => onKind(k)}
              className={cn("h-9 min-w-12 rounded-full px-3 text-sm font-bold", kind === k ? "bg-accent text-on-accent" : "text-muted hover:text-fg")}
            >
              {k === "percent" ? "%" : "FCFA"}
            </button>
          ))}
        </div>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={kind === "percent" ? "10" : "5 000"}
          aria-label={kind === "percent" ? "Pourcentage de remise" : "Montant de la remise en FCFA"}
          aria-invalid={error ? true : undefined}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-raised px-4 text-[1rem] font-semibold tabular-nums outline-none focus:border-accent focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-danger"
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

const num = (s: string) => {
  const n = parseAmount(s);
  return n == null || Number.isNaN(n) ? NaN : n;
};

// --- Formulaire promotion ---------------------------------------------------------------

function PromotionForm({
  promo,
  categories,
  products,
  onDone,
}: {
  promo: DbPromotion | null;
  categories: Option[];
  products: ProductOption[];
  onDone: () => void;
}) {
  const toast = useUI((s) => s.showToast);
  const [name, setName] = useState(promo?.name ?? "");
  const [kind, setKind] = useState<DiscountKind>(promo?.kind ?? "percent");
  const [value, setValue] = useState(promo ? String(promo.value) : "");
  const [scope, setScope] = useState(promo?.scope ?? "all");
  const [categoryId, setCategoryId] = useState(promo?.category_id ?? "");
  const [productId, setProductId] = useState(promo?.product_id ?? "");
  const [starts, setStarts] = useState(dateInput(promo?.starts_at ?? null));
  const [ends, setEnds] = useState(dateInput(promo?.ends_at ?? null));
  const [active, setActive] = useState(promo?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const v = num(value);
  const product = products.find((p) => p.id === productId);
  const examplePrice = scope === "product" && product && product.price > 0 ? product.price : 100_000;
  const after = Number.isFinite(v) && v > 0 ? discounted(examplePrice, kind, v) : null;

  const submit = () => {
    const input = {
      id: promo?.id,
      name,
      kind,
      value: v,
      scope,
      category_id: categoryId || null,
      product_id: productId || null,
      starts_at: toIso(starts),
      ends_at: toIso(ends, true),
      is_active: active,
    };
    const check = promotionSchema.safeParse(input);
    if (!check.success) return setErrors(fieldErrors(check.error));
    start(async () => {
      const res = await savePromotion(input);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        return toast({ title: "Pas enregistré", text: res.error, tone: "error" });
      }
      toast({ title: promo ? "Promotion enregistrée" : "Promotion créée", text: name });
      onDone();
    });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <Field
        label="Nom *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="Ex. Soldes de la Tabaski"
        hint="Pour vous seulement : le client voit le prix barré."
        autoFocus
      />
      <DiscountField kind={kind} value={value} onKind={setKind} onValue={setValue} error={errors.value} />

      <fieldset className="min-w-0">
        <legend className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
          Sur quels produits&nbsp;?
          <HelpTip label="Aide : cible de la promotion">
            Les remises ne s&apos;additionnent pas : si un produit a plusieurs promotions (ou un prix promo sur sa fiche), le client paie le prix le plus bas.
          </HelpTip>
        </legend>
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
          {(
            [
              ["all", "Tout le site"],
              ["category", "Une catégorie"],
              ["product", "Un produit"],
            ] as const
          ).map(([k, label]) => (
            <label
              key={k}
              className={cn(
                "flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-2xl px-1.5 py-1 text-center text-sm leading-tight font-semibold ring-1",
                scope === k ? "bg-accent-soft ring-accent" : "bg-raised/40 ring-line hover:ring-fg/40",
              )}
            >
              <input type="radio" name="scope" className="sr-only" checked={scope === k} onChange={() => setScope(k)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {scope === "category" && (
        <SelectField label="Catégorie *" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category_id}>
          <option value="">Choisir…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      )}
      {scope === "product" && (
        <SelectField label="Produit *" value={productId} onChange={(e) => setProductId(e.target.value)} error={errors.product_id}>
          <option value="">Choisir…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.price > 0 ? ` (${formatAmount(p.price)} FCFA)` : ""}
            </option>
          ))}
        </SelectField>
      )}

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
        <Field label="Début" type="date" value={starts} onChange={(e) => setStarts(e.target.value)} error={errors.starts_at} hint="Vide : tout de suite." />
        <Field label="Fin (incluse)" type="date" value={ends} onChange={(e) => setEnds(e.target.value)} error={errors.ends_at} hint="Vide : sans fin." />
      </div>

      {after != null && after > 0 && after < examplePrice && (
        <p className="rounded-2xl bg-raised p-3 text-sm">
          {scope === "product" && product ? product.name : "Un produit"} à <strong>{formatPrice(examplePrice)}</strong> passera à{" "}
          <strong className="text-gold-text">{formatPrice(after)}</strong>.
        </p>
      )}

      <Switch checked={active} onChange={setActive} label={active ? "Activée" : "Désactivée (en pause)"} showLabel />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="light" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : promo ? "Enregistrer" : "Créer la promotion"}
        </Button>
      </div>
    </form>
  );
}

// --- Formulaire code promo --------------------------------------------------------------

function CodeForm({ code, onDone }: { code: DbPromoCode | null; onDone: () => void }) {
  const toast = useUI((s) => s.showToast);
  const [text, setText] = useState(code?.code ?? "");
  const [kind, setKind] = useState<DiscountKind>(code?.kind ?? "percent");
  const [value, setValue] = useState(code ? String(code.value) : "");
  const [minOrder, setMinOrder] = useState(code?.min_order ? formatAmount(code.min_order) : "");
  const [maxUses, setMaxUses] = useState(code?.max_uses ? String(code.max_uses) : "");
  const [expires, setExpires] = useState(dateInput(code?.expires_at ?? null));
  const [active, setActive] = useState(code?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const submit = () => {
    const min = minOrder.trim() ? num(minOrder) : 0;
    const uses = maxUses.trim() ? num(maxUses) : null;
    const input = { id: code?.id, code: text, kind, value: num(value), min_order: min, max_uses: uses, expires_at: toIso(expires, true), is_active: active };
    const check = promoCodeSchema.safeParse(input);
    if (!check.success) {
      const e = fieldErrors(check.error);
      if (e.min_order) e.min_order = "Montant invalide.";
      if (e.max_uses) e.max_uses = "Nombre invalide.";
      return setErrors(e);
    }
    start(async () => {
      const res = await savePromoCode(input);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        return toast({ title: "Pas enregistré", text: res.error, tone: "error" });
      }
      toast({ title: code ? "Code enregistré" : "Code créé", text: text.toUpperCase() });
      onDone();
    });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <Field
        label="Code *"
        value={text}
        onChange={(e) => setText(e.target.value.toUpperCase().replace(/\s/g, ""))}
        error={errors.code}
        placeholder="BIENVENUE10"
        hint="Lettres et chiffres, sans espace. Le client peut le taper en minuscules."
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={30}
        className="[&_input]:font-mono [&_input]:tracking-wider"
        autoFocus
      />
      <DiscountField kind={kind} value={value} onKind={setKind} onValue={setValue} error={errors.value} />
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
        <Field
          label="Achat minimum"
          inputMode="numeric"
          value={minOrder}
          onChange={(e) => setMinOrder(e.target.value)}
          error={errors.min_order}
          placeholder="0"
          hint="En FCFA. Vide : aucun."
        />
        <Field
          label={
            <>
              Utilisations max.{" "}
              <HelpTip label="Aide : utilisations">
                Nombre total de commandes qui peuvent utiliser ce code, tous clients confondus. Une commande annulée rend son utilisation.
              </HelpTip>
            </>
          }
          inputMode="numeric"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          error={errors.max_uses}
          placeholder="Illimité"
          hint="Vide : illimité."
        />
      </div>
      <Field
        label="Valable jusqu'au (inclus)"
        type="date"
        value={expires}
        onChange={(e) => setExpires(e.target.value)}
        error={errors.expires_at}
        hint="Vide : sans date de fin."
      />
      <Switch checked={active} onChange={setActive} label={active ? "Activé" : "Désactivé (en pause)"} showLabel />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="light" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : code ? "Enregistrer" : "Créer le code"}
        </Button>
      </div>
    </form>
  );
}
