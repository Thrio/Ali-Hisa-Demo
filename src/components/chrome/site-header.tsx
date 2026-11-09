"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteSettings } from "@/sanity/types";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  site: SiteSettings;
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader({ site }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[var(--header-bg)] text-[var(--color-on-accent)]">
      <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-[var(--space-2)] px-[var(--gutter-inline)] py-[var(--space-3)] md:h-[var(--header-height)] md:flex-row md:items-center md:justify-between md:gap-[var(--space-8)] md:py-0">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-[var(--tracking-display)] text-[var(--color-on-accent)]"
        >
          <Image
            src={site.logo.src}
            alt=""
            width={site.logo.width}
            height={site.logo.height}
            priority
            className="h-14 w-14 rounded-full bg-[var(--color-surface-elevated)] object-contain shadow-[var(--shadow-subtle)]"
          />
          <span>{site.name}</span>
        </Link>

        <nav aria-label="Primary">
          <ul className="m-0 flex list-none flex-wrap items-center gap-x-[var(--space-4)] gap-y-[var(--space-1)] whitespace-nowrap p-0 sm:gap-x-[var(--space-6)] md:gap-x-[var(--space-8)]">
            {site.nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-block border-b py-[var(--space-1)] font-[family-name:var(--font-display)] text-xs font-medium uppercase tracking-[var(--tracking-display)] transition-[color,border-color] duration-[var(--motion-header-duration)] ease-[var(--motion-header-ease)]",
                      active
                        ? "border-[var(--color-on-accent)] text-[var(--color-on-accent)]"
                        : "border-transparent text-[color-mix(in_oklch,var(--color-on-accent)_70%,transparent)] hover:text-[var(--color-on-accent)]",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
