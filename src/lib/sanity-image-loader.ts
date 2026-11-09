import type { ImageLoaderProps } from "next/image";

/** Sanity CDN query params for static-export `next/image`. */
export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith("/")) {
    return src;
  }
  const q = quality ?? 75;
  const url = new URL(src);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(q));
  return url.toString();
}
