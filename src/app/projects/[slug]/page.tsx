type PageProps = { params: Promise<{ slug: string }> };

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <section className="mx-auto max-w-[var(--content-max)] px-[var(--gutter-inline)] py-[var(--section-pad-y)]">
      <h1 className="font-[family-name:var(--font-display)] text-[var(--text-2xl)] font-semibold uppercase tracking-[var(--tracking-display)]">
        Projekt: {slug}
      </h1>
      <p className="mt-4 text-[var(--color-on-surface-muted)]">Shell route — /build</p>
    </section>
  );
}

export function generateStaticParams() {
  return [{ slug: "placeholder" }];
}
