import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listMyOrders } from "@/lib/customer-orders";
import { OrderCard } from "@/components/account/OrderBits";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = { title: "Mes commandes", robots: { index: false } };

export default function MyOrdersPage() {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <Link href="/compte" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
          ← Mon compte
        </Link>
        <h1 className="mt-3 text-[clamp(2.25rem,9vw,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
          Mes commandes<span className="text-gold">.</span>
        </h1>
        <Suspense fallback={<div className="skeleton mt-6 h-64 rounded-card" />}>
          <Orders />
        </Suspense>
      </div>
    </Container>
  );
}

async function Orders() {
  const orders = await listMyOrders(100);
  if (!orders.length)
    return (
      <div className="mt-6 rounded-card bg-surface p-6 text-center shadow-soft">
        <p className="text-muted">Pas encore de commande.</p>
        <Link href="/boutique" className={buttonClasses("primary", "md", "mt-3")}>
          Voir la boutique
        </Link>
      </div>
    );
  return (
    <ul className="mt-6 space-y-2">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </ul>
  );
}
