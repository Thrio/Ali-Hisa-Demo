import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const routes = ["/", "/about", "/services", "/contact", "/projects", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://alihisa.com";
  return routes.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: new Date(),
  }));
}
