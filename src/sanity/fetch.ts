import homeFixture from "./mock/home.json";
import siteFixture from "./mock/site-settings.json";
import type { HomePage, SiteSettings } from "./types";

export async function getSiteSettings(): Promise<SiteSettings> {
  if (process.env.CONTENT_SOURCE === "mock" || !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return siteFixture as SiteSettings;
  }
  // Live Sanity fetch wired at /build when project ID exists
  return siteFixture as SiteSettings;
}

export async function getHomePage(): Promise<HomePage> {
  return homeFixture as HomePage;
}
