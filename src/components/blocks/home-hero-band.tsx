import Image from "next/image";

const HERO = { src: "/images/facebook/Ali_foto1.jpg", width: 2048, height: 1374 };

/**
 * Home band 1 — full-width hero photograph shown uncropped (the render carries the client's mark).
 */
export function HomeHeroBand() {
  return (
    <section data-band="1" className="relative w-full">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${HERO.width} / ${HERO.height}` }}
      >
        <Image
          src={HERO.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>
    </section>
  );
}
