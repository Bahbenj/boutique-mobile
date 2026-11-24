import type { Metadata } from "next";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: t.checkout.title,
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <h1 className="text-[clamp(2.75rem,10vw,5rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
        {t.checkout.title}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-4 mb-10 max-w-xl text-muted sm:text-lg">{t.checkout.lead}</p>
      <CheckoutForm />
    </Container>
  );
}
