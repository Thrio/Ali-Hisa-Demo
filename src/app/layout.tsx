import type { Metadata } from "next";
import { Golos_Text, Jost } from "next/font/google";
import { SiteFooter } from "@/components/chrome/site-footer";
import { SiteHeader } from "@/components/chrome/site-header";
import { getSiteSettings } from "@/sanity/fetch";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const display = Jost({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-family-display",
  weight: ["500", "600", "700"],
});

const body = Golos_Text({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-family-body",
  weight: ["400", "500"],
});

const isDemo = Boolean(process.env.NEXT_PUBLIC_BASE_PATH);

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://alihisa.com";
  return {
    ...(isDemo ? { robots: { index: false, follow: false } } : {}),
    metadataBase: new URL(base),
    title: {
      default: site.name,
      template: `%s · ${site.name}`,
    },
    description: site.defaultDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteSettings();

  return (
    <html lang="mk" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader site={site} />
        <main className="flex-1">{children}</main>
        <SiteFooter site={site} />
        <Analytics />
      </body>
    </html>
  );
}
