import { HeroScroll } from "@/components/sections/HeroScroll";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export default function HomePage() {
  return (
    <>
      <HeroScroll />
      {/* Aperçu temporaire du design system, remplacé à l'étape 3 par les sections d'accueil */}
      <section className="py-20 sm:py-28">
        <Container>
          <Badge index={1}>Neufs</Badge>
          <h2 className="mt-4 max-w-2xl text-4xl font-extrabold sm:text-6xl">La suite arrive à l&apos;étape 3.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {["Neufs", "Occasion", "Accessoires"].map((c, i) => (
              <Card key={c} interactive className="p-6">
                <Badge index={i + 1} tone="cream">{c}</Badge>
                <p className="mt-16 text-2xl font-extrabold tracking-tight">{c}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
