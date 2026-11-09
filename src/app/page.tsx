import { HomeCraftBand } from "@/components/blocks/home-craft-band";
import { HomeHeroBand } from "@/components/blocks/home-hero-band";
import { HomeIntroBand } from "@/components/blocks/home-intro-band";
import { HomeSlideshowBand } from "@/components/blocks/home-slideshow-band";
import { getHomePage, getSiteSettings } from "@/sanity/fetch";

export default async function HomePage() {
  const [site, home] = await Promise.all([getSiteSettings(), getHomePage()]);

  return (
    <>
      <h1 className="sr-only">{site.name}</h1>
      <HomeHeroBand />
      <HomeIntroBand intro={home.intro} logo={site.logo} />
      <HomeCraftBand craft={home.craft} />
      <HomeSlideshowBand slides={home.slideshow} />
    </>
  );
}
