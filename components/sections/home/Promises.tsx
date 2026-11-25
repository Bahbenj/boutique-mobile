import type { ComponentType } from "react";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { HexIcon } from "@/components/ui/Hex";
import { IconCash, IconHeadset, IconShield, IconTruck } from "@/components/ui/icons";

const items: { key: keyof typeof t.promises; Icon: ComponentType<{ size?: number }> }[] = [
  { key: "cod", Icon: IconCash },
  { key: "delivery", Icon: IconTruck },
  { key: "warranty", Icon: IconShield },
  { key: "afterSales", Icon: IconHeadset },
];

/** Bandeau de réassurance juste après le hero. */
export function Promises() {
  return (
    <section aria-label="Nos engagements" className="border-b border-line">
      <Container>
        <ul className="grid grid-cols-2 lg:grid-cols-4">
          {items.map(({ key, Icon }, i) => (
            <li
              key={key}
              className={
                "flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:gap-4 sm:py-8 " +
                // Séparateurs internes : verticaux entre colonnes, horizontal entre lignes (mobile)
                (i % 2 === 1 ? "border-s border-line ps-4 sm:ps-6 " : "pe-4 sm:pe-6 ") +
                (i < 2 ? "border-b border-line lg:border-b-0 " : "") +
                (i === 2 ? "lg:border-s lg:border-line lg:ps-6 " : "")
              }
            >
              <HexIcon>
                <Icon size={20} />
              </HexIcon>
              <span>
                <span className="block text-[0.9375rem] leading-snug font-bold tracking-tight">{t.promises[key].title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">{t.promises[key].text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
