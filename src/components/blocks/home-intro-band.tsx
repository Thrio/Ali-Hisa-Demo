import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { HomeIntro, ImageAsset } from "@/sanity/types";

type HomeIntroBandProps = {
  intro: HomeIntro;
  logo: ImageAsset;
};

export function HomeIntroBand({ intro, logo }: HomeIntroBandProps) {
  return (
    <section
      data-band="2"
      aria-labelledby="home-intro-title"
      className="bg-[var(--color-surface)] px-[var(--gutter-inline)] py-[var(--space-11)]"
    >
      <ScrollReveal className="mx-auto flex max-w-[44rem] flex-col items-center text-center">
        <Image
          src={logo.src}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
          sizes="(min-width: 768px) 20rem, 14rem"
          className="h-auto w-56 mix-blend-multiply md:w-80"
        />

        <p className="mt-[var(--space-6)] font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-on-surface)]">
          {intro.eyebrow}
        </p>
        <h2
          id="home-intro-title"
          className="mt-[var(--space-2)] font-[family-name:var(--font-display)] text-[var(--text-2xl)] font-medium uppercase leading-[var(--leading-tight)] tracking-[0.08em] text-[var(--color-on-surface)] md:text-[var(--text-3xl)]"
        >
          {intro.title}
        </h2>
        <p className="mt-[var(--space-3)] font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-on-surface)]">
          {intro.since}
        </p>

        <div className="mt-[var(--space-6)] text-[var(--text-lg)] leading-[var(--leading-normal)] text-[var(--color-on-surface-muted)]">
          {intro.body.map((line) => (
            <p key={line} className="m-0">
              {line}
            </p>
          ))}
        </div>

        <Link
          href={intro.cta.href}
          className="mt-[var(--space-8)] inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-on-surface)] bg-[var(--color-on-surface)] px-[var(--space-7)] py-[var(--space-3)] font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[var(--tracking-display)] text-[var(--color-surface)] transition-colors duration-[var(--motion-header-duration)] ease-[var(--motion-header-ease)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)]"
        >
          {intro.cta.label}
        </Link>
      </ScrollReveal>
    </section>
  );
}
