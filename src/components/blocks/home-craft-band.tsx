import Image from "next/image";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { HomeCraft } from "@/sanity/types";

type HomeCraftBandProps = {
  craft: HomeCraft;
};

export function HomeCraftBand({ craft }: HomeCraftBandProps) {
  return (
    <section
      data-band="3"
      aria-labelledby="home-craft-title"
      className="relative flex h-[clamp(22rem,48vw,38rem)] w-full items-center justify-center overflow-hidden bg-[var(--color-on-surface)]"
    >
      <Image
        src={craft.image.src}
        alt={craft.image.alt}
        fill
        sizes="100vw"
        className="object-cover object-[50%_45%]"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[color-mix(in_oklch,var(--color-on-surface)_52%,transparent)]"
        aria-hidden
      />

      <ScrollReveal className="relative z-[1] mx-auto max-w-[44rem] px-[var(--gutter-inline)] text-center text-[var(--color-on-accent)]">
        <p className="m-0 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.22em] opacity-90">
          {craft.eyebrow}
        </p>
        <h2
          id="home-craft-title"
          className="mt-[var(--space-4)] font-[family-name:var(--font-display)] text-[var(--text-2xl)] font-medium uppercase leading-[var(--leading-tight)] tracking-[0.06em] md:text-[var(--text-3xl)]"
        >
          {craft.title}
        </h2>
        <p className="mx-auto mt-[var(--space-5)] mb-0 max-w-[32rem] text-[var(--text-lg)] leading-[var(--leading-normal)] opacity-90">
          {craft.body}
        </p>
      </ScrollReveal>
    </section>
  );
}
