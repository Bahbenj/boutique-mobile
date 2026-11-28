"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { siteConfig } from "@/config/site";
import { heroScenes as scenes } from "@/data/home";
import { t } from "@/i18n";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconArrowRight, IconWhatsApp } from "@/components/ui/icons";
import { useWhatsappLink } from "@/components/layout/StoreInfoProvider";

const pad = (n: number) => String(n).padStart(2, "0");
const N = scenes.length;
/** Minutage de la timeline (unités arbitraires ; 1 unité ≈ 90 % de hauteur d'écran). */
const HOLD = 0.4; // pause sur une scène
const TRANS = 0.6; // durée d'une transition
const STEP = HOLD + TRANS;
const SCROLL_PER_UNIT = 90;
const sceneAt = (i: number) => HOLD + (i - 1) * STEP; // début de la transition vers la scène i
const TOTAL = sceneAt(N - 1) + TRANS + HOLD;

/**
 * Hero plein écran épinglé : le scroll pilote crossfade + zoom des visuels,
 * changement du grand titre, compteur et barre de progression.
 * Sans animation (prefers-reduced-motion) : hero statique sur la 1re scène.
 *
 * GSAP (≈ 120 Ko) est chargé après l'affichage, quand le navigateur est libre, et
 * l'animation s'installe au premier geste : la 1re scène est déjà rendue par le
 * serveur. Gain mesuré sur un téléphone moyen : ~0,5 s de calcul en moins au
 * chargement, grand titre affiché (LCP) 2 s plus tôt.
 */
export function HeroScroll() {
  const waLink = useWhatsappLink();

  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const setHeroActive = useUI((s) => s.setHeroActive);

  useEffect(() => {
    let cancelled = false;
    let started = false;
    let revert: (() => void) | undefined;
    // 1. Téléchargement et préparation de GSAP quand le navigateur est libre (sans toucher la page)
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    let loadModules: (() => void) | undefined;
    const modules = new Promise<[typeof import("gsap"), typeof import("gsap/ScrollTrigger")]>((resolve) => {
      loadModules = () => void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(resolve);
    });
    const handle = idle(() => loadModules?.(), { timeout: 1500 });

    // 2. Installation au premier geste (l'animation suit le défilement) : le grand titre
    //    n'est jamais retouché pendant que le navigateur mesure l'affichage (LCP), qui
    //    s'arrête justement au premier geste. Mesuré : LCP 3,4 s → 1,5 s (téléphone moyen).
    const gestures = ["scroll", "wheel", "touchstart", "pointerdown", "keydown", "mousemove"] as const;
    const start = async () => {
      if (started) return;
      started = true;
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
      loadModules?.();
      const [{ gsap }, { ScrollTrigger }] = await modules;
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          ScrollTrigger.config({ ignoreMobileResize: true });
          const q = gsap.utils.selector(root);
          const imgs = q("[data-img]");
          const zooms = q("[data-zoom]");
          const titles = q("[data-title]");
          const texts = q("[data-text]");

          // Scène 1 : déjà en place depuis le serveur, jamais touchée à l'installation. La
          // retransformer (même sans déplacement) fait recompter le grand titre comme
          // « plus grand élément affiché » au moment où GSAP arrive : LCP mesuré +2 s.
          gsap.set(imgs.slice(1), { opacity: 0 });
          // y: 0 neutralise le translateY(120%) inline du SSR (sinon cumulé au yPercent)
          gsap.set(titles.slice(1), { y: 0, yPercent: 120 });
          gsap.set(texts.slice(1), { autoAlpha: 0, y: 16 });

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            onUpdate() {
              // Scène active = dernière transition passée à mi-parcours
              const idx = Math.floor((tl.time() - HOLD - TRANS / 2) / STEP) + 1;
              const clamped = Math.max(0, Math.min(N - 1, idx));
              setActive((prev) => (prev === clamped ? prev : clamped));
            },
          });

          // Zoom lent continu sur chaque visuel pendant sa présence à l'écran
          zooms.forEach((el, i) => {
            const start = i === 0 ? 0 : sceneAt(i);
            const end = i === N - 1 ? TOTAL : sceneAt(i + 1) + TRANS;
            tl.fromTo(el, { scale: 1.18, yPercent: 0 }, { scale: 1, yPercent: -4, ease: "none", duration: end - start }, start);
          });

          // Transitions : pause → transition → pause…
          for (let i = 1; i < N; i++) {
            const at = sceneAt(i);
            tl.to(imgs[i], { opacity: 1, duration: 0.5 }, at)
              .to(imgs[i - 1], { opacity: 0, duration: 0.5 }, at + 0.1)
              .to(titles[i - 1], { yPercent: -120, duration: 0.35, ease: "power3.in" }, at + 0.05)
              .to(titles[i], { yPercent: 0, duration: 0.4, ease: "power3.out" }, at + 0.2)
              .to(texts[i - 1], { autoAlpha: 0, y: -12, duration: 0.2 }, at)
              .to(texts[i], { autoAlpha: 1, y: 0, duration: 0.25 }, at + 0.3);
          }

          // Barre de progression sur toute la durée (inclut la pause finale)
          tl.fromTo(q("[data-progress]"), { scaleX: 0 }, { scaleX: 1, ease: "none", duration: TOTAL }, 0);

          triggerRef.current = ScrollTrigger.create({
            trigger: root.current,
            start: "top top",
            end: () => `+=${TOTAL * SCROLL_PER_UNIT}%`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            animation: tl,
            onToggle: (self) => setHeroActive(self.isActive),
          });

          // Arrivée directe sur /#ancre : le navigateur a défilé avant l'ajout de
          // l'espace d'épinglage, on recale donc sur la cible une fois le pin créé.
          const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
          if (target) requestAnimationFrame(() => target.scrollIntoView());

          return () => {
            triggerRef.current = null;
            setHeroActive(false);
          };
        });
      }, root);
      revert = () => ctx.revert();
    };
    const onGesture = () => void start();
    gestures.forEach((g) => window.addEventListener(g, onGesture, { passive: true }));
    // Page déjà défilée (retour arrière) ou ouverte sur une ancre (/#services) : tout de suite
    if (window.scrollY > 0 || window.location.hash) void start();
    return () => {
      cancelled = true;
      cancelIdle(handle);
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
      revert?.();
    };
  }, [setHeroActive]);

  /** Clic sur une étape : défile jusqu'à la scène correspondante. */
  const goTo = (i: number) => {
    const st = triggerRef.current;
    if (!st) return;
    const time = i === 0 ? 0 : sceneAt(i) + TRANS + 0.05;
    const y = st.start + (st.end - st.start) * (time / TOTAL);
    window.scrollTo({ top: y + 2, behavior: "smooth" });
  };

  const scene = scenes[active];

  return (
    <section aria-label="Présentation" className="relative">
      <div ref={root} className="relative h-svh min-h-[34rem] w-full overflow-hidden bg-canvas text-white">
        {/* Visuels */}
        <div className="absolute inset-0" aria-hidden="true">
          {scenes.map((s, i) => (
            <div key={s.title} data-img className="absolute inset-0" style={{ opacity: i === 0 ? 1 : 0 }}>
              <div data-zoom className="absolute inset-0 will-change-transform">
                <Image
                  src={s.image}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={75}
                  preload={i === 0}
                  fetchPriority={i === 0 ? "high" : "low"}
                  className="object-cover"
                  style={{ objectPosition: s.focus }}
                />
              </div>
            </div>
          ))}
          {/* Voiles pour la lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent lg:via-transparent" />
        </div>

        {/* Compteur + label (haut gauche) */}
        <div className="absolute start-4 top-[5.25rem] flex items-center gap-3 sm:start-8 sm:top-28">
          <p className="flex items-baseline font-bold tabular-nums" aria-live="polite">
            <span className="sr-only">Étape </span>
            <span className="relative inline-flex h-[1.2em] overflow-hidden text-lg leading-[1.2] sm:text-xl">
              <span
                className="flex flex-col transition-transform duration-500 ease-out-expo"
                style={{ transform: `translateY(-${active * 1.2}em)` }}
                aria-hidden="true"
              >
                {scenes.map((_, i) => (
                  <span key={i}>{pad(i + 1)}</span>
                ))}
              </span>
              <span className="sr-only">{pad(active + 1)}</span>
            </span>
            <span className="ms-1.5 text-sm text-white/50">
              <span aria-hidden="true">/ </span>
              <span className="sr-only">sur </span>
              {pad(N)}
            </span>
          </p>
          <Badge tone="glass">{scene.label}</Badge>
        </div>

        {/* Étapes (desktop) */}
        <ol className="absolute end-8 top-1/2 hidden -translate-y-1/2 space-y-1 lg:block motion-reduce:lg:hidden">
          {scenes.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === active ? "step" : undefined}
                className={cn(
                  "flex w-full items-center justify-end gap-3 rounded-full py-1.5 ps-3 pe-1 text-sm font-semibold transition-colors",
                  i === active ? "text-white" : "text-white/40 hover:text-white/75",
                )}
              >
                {s.label}
                <span
                  className={cn(
                    "h-px transition-all duration-500 ease-out-expo",
                    i === active ? "w-10 bg-accent" : "w-4 bg-current",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>

        {/* Contenu principal (bas) */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-14 sm:px-8 sm:pb-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div>
              <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white/75 sm:text-base">
                <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-on-gold">{t.home.since(siteConfig.since)}</span>
                {siteConfig.slogan}
              </p>
              <h1 className="relative">
                <span className="sr-only">
                  {scenes.map((s) => s.title).join(" ")} {siteConfig.name} : smartphones, accessoires et service après-vente à Bamako, livraison dans tout le Mali.
                </span>
                {/* Pile de titres masquée : un seul visible à la fois */}
                <span
                  aria-hidden="true"
                  className="text-display relative -mt-[0.16em] block overflow-hidden text-[clamp(3.5rem,17.5vw,9rem)] lg:text-[min(12.5vw,12rem)]"
                >
                  {scenes.map((s, i) => (
                    <span
                      key={s.title}
                      data-title
                      // pt/pb : place pour les accents (É) et le jambage, dans la zone masquée
                      className={cn("block pt-[0.16em] pb-[0.06em] will-change-transform", i > 0 && "absolute inset-x-0 top-0")}
                      style={{ transform: i === 0 ? undefined : "translateY(120%)" }}
                    >
                      {s.title.replace(/\.$/, "")}
                      <span className="text-gold">.</span>
                    </span>
                  ))}
                </span>
              </h1>
            </div>

            <div className="lg:w-[24rem] lg:shrink-0 lg:pb-4">
              <div className="relative grid">
                {scenes.map((s, i) => (
                  <p
                    key={s.title}
                    data-text
                    className="col-start-1 row-start-1 text-base leading-relaxed text-white/80 sm:text-lg"
                    style={i === 0 ? undefined : { opacity: 0, visibility: "hidden" }}
                  >
                    {s.text}
                  </p>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5 lg:flex-nowrap">
                <Button href="/boutique" size="lg" icon={<IconArrowRight size={18} className="rtl:rotate-180" />}>
                  {t.hero.primary}
                </Button>
                {/* Sur mobile : bouton rond icône seule pour tenir sur une ligne */}
                <Button
                  href={waLink(t.whatsapp.greeting)}
                  size="lg"
                  variant="outline"
                  className="w-14 border-white/30 bg-white/5 px-0! text-white backdrop-blur-md hover:bg-white/15 sm:w-auto sm:px-7!"
                >
                  <IconWhatsApp size={22} />
                  <span className="sr-only sm:not-sr-only">WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de progression fine + indice de scroll */}
        <div className="absolute inset-x-4 bottom-5 flex items-center gap-4 sm:inset-x-8 sm:bottom-6">
          <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div data-progress className="absolute inset-0 origin-left scale-x-0 bg-accent rtl:origin-right" />
          </div>
          <span className="text-xs font-medium text-white/60">{t.hero.scroll}</span>
        </div>
      </div>
    </section>
  );
}
