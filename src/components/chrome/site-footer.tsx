import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { FacebookIcon, InstagramIcon } from "@/components/chrome/social-icons";
import type { SiteSettings } from "@/sanity/types";
import { formatPhoneDisplay } from "@/lib/utils";

type SiteFooterProps = {
  site: SiteSettings;
};

const linkClass =
  "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-[color-mix(in_oklch,var(--color-on-accent)_68%,transparent)] transition-[color,background-size] duration-300 ease-out hover:bg-[length:100%_1px] hover:text-[var(--color-on-accent)] focus-visible:bg-[length:100%_1px] focus-visible:text-[var(--color-on-accent)]";

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-[var(--space-5)] font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-on-accent)]">
      {children}
    </h2>
  );
}

export function SiteFooter({ site }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const phones = [site.phonePrimary, site.phoneSecondary].filter(Boolean) as string[];
  const socials = [
    site.instagramUrl && { label: "Instagram", href: site.instagramUrl, Icon: InstagramIcon },
    site.facebookUrl && { label: "Facebook", href: site.facebookUrl, Icon: FacebookIcon },
  ].filter(Boolean) as { label: string; href: string; Icon: typeof InstagramIcon }[];

  return (
    <footer className="bg-[var(--color-on-surface)] text-[var(--color-on-accent)]">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--gutter-inline)]">
        <div className="grid gap-x-[var(--space-8)] gap-y-[var(--space-9)] py-[var(--space-10)] sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] lg:py-[var(--space-11)]">
          <div className="sm:col-span-2 lg:col-span-1 lg:pr-[var(--space-8)]">
            <Link href="/" className="inline-flex items-center gap-[var(--space-3)]">
              <Image
                src={site.logo.src}
                alt=""
                width={site.logo.width}
                height={site.logo.height}
                className="h-20 w-20 rounded-full bg-[var(--color-surface-elevated)] object-contain"
              />
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold uppercase tracking-[var(--tracking-display)]">
                {site.name}
              </span>
            </Link>
            <p className="mt-[var(--space-5)] max-w-[24rem] text-base leading-relaxed text-[var(--color-on-accent)]">
              {site.footer.tagline}
            </p>
            <p className="mt-[var(--space-3)] max-w-[24rem] text-sm leading-relaxed text-[color-mix(in_oklch,var(--color-on-accent)_60%,transparent)]">
              {site.footer.intro}
            </p>
          </div>

          <nav aria-label="Footer">
            <FooterHeading>Navigimi</FooterHeading>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0 text-sm">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <FooterHeading>Shërbimet tona</FooterHeading>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0 text-sm">
              {site.footer.services.map((service) => (
                <li key={service}>
                  <Link href="/services" className={linkClass}>
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <FooterHeading>Kontakt</FooterHeading>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0 text-sm">
              {phones.map((phone) => (
                <li key={phone} className="flex items-center gap-[var(--space-2)]">
                  <Phone className="h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} aria-hidden />
                  <a href={`tel:${phone}`} className={linkClass}>
                    {formatPhoneDisplay(phone)}
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-[var(--space-2)]">
                <Mail className="h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} aria-hidden />
                <a href={`mailto:${site.email}`} className={linkClass}>
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-[var(--space-2)] text-[color-mix(in_oklch,var(--color-on-accent)_68%,transparent)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} aria-hidden />
                <span>
                  {site.city}, {site.country}
                </span>
              </li>
            </ul>
          </div>

          {socials.length > 0 ? (
            <div>
              <FooterHeading>Na ndiqni</FooterHeading>
              <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0 text-sm">
                {socials.map(({ label, href, Icon }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-[var(--space-3)] text-[color-mix(in_oklch,var(--color-on-accent)_68%,transparent)] transition-colors duration-300 hover:text-[var(--color-on-accent)] focus-visible:text-[var(--color-on-accent)]"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_oklch,var(--color-on-accent)_22%,transparent)] transition-[background-color,border-color,color,transform] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-[var(--color-on-accent)] group-hover:bg-[var(--color-on-accent)] group-hover:text-[var(--color-on-surface)]">
                        <Icon className="h-[1.125rem] w-[1.125rem]" />
                      </span>
                      <span>{label}</span>
                      <span className="sr-only"> (hapet në dritare të re)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-[var(--space-3)] border-t border-[color-mix(in_oklch,var(--color-on-accent)_12%,transparent)] py-[var(--space-6)] text-xs text-[color-mix(in_oklch,var(--color-on-accent)_50%,transparent)] sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0">
            © {year} {site.name}. Të gjitha të drejtat e rezervuara.
          </p>
          {site.legalNav.length > 0 ? (
            <ul className="m-0 flex list-none gap-[var(--space-5)] p-0">
              {site.legalNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
