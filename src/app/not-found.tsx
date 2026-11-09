import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-[var(--content-max)] px-[var(--gutter-inline)] py-[var(--section-pad-y)]">
      <h1 className="font-[family-name:var(--font-display)] text-[var(--text-2xl)] font-semibold uppercase tracking-[var(--tracking-display)]">
        [[PENDING: 404 title]]
      </h1>
      <p className="mt-4">
        <Link href="/" className="underline">
          Kreu
        </Link>
      </p>
    </section>
  );
}
