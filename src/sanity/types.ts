export type SiteSettings = {
  name: string;
  defaultDescription: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email: string;
  facebookUrl?: string;
  instagramUrl?: string;
  city: string;
  country: string;
  foundedYear: number;
  footer: {
    tagline: string;
    intro: string;
    services: string[];
  };
  nav: { label: string; href: string }[];
  legalNav: { label: string; href: string }[];
  primaryCtaLabel: string;
  logo: ImageAsset;
};

export type ImageAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type SlideAsset = ImageAsset & {
  /** CSS object-position for the crop */
  focus?: string;
  title: string;
  body: string;
};

export type HomeIntro = {
  eyebrow: string;
  title: string;
  since: string;
  body: string[];
  cta: { label: string; href: string };
};

export type HomeCraft = {
  image: ImageAsset;
  eyebrow: string;
  title: string;
  body: string;
};

export type HomePage = {
  slideshow: SlideAsset[];
  intro: HomeIntro;
  craft: HomeCraft;
};
