/** Stock : valeurs et libellés partagés navigateur / serveur. */

/** Seuil « stock faible » par défaut ; réglable dans /admin/stock (settings.stock.low_threshold). */
export const DEFAULT_LOW_STOCK = 3;

export type StockReason = "vente" | "annulation" | "reprise" | "ajustement" | "creation";

export const stockReasons: Record<StockReason, string> = {
  vente: "Vente",
  annulation: "Commande annulée",
  reprise: "Commande réactivée",
  ajustement: "Ajustement",
  creation: "Stock de départ",
};

export type StockMovement = {
  id: number;
  product_id: string | null;
  product_name: string;
  delta: number;
  stock_after: number;
  reason: StockReason;
  note: string | null;
  actor: string | null;
  created_at: string;
};
