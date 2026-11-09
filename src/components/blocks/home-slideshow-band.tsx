"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { reveal } from "@/lib/motion-tokens";
import type { SlideAsset } from "@/sanity/types";

/** Scroll distance per slide, in viewport heights. */
const SCROLL_PER_SLIDE_VH = 200;

const ENTER_DURATION_MS = 1300;
const ENTER_DISTANCE_PX = 32;
const ENTER_EASE = `cubic-bezier(${reveal.ease.join(",")})`;

const subscribe = () => () => {};

function enterStyle(hidden: boolean, delayMs: number): CSSProperties {
  return {
    opacity: hidden ? 0 : 1,
    transform: hidden ? `translateY(${ENTER_DISTANCE_PX}px)` : "none",
    transition: hidden
      ? "none"
      : `opacity ${ENTER_DURATION_MS}ms ${ENTER_EASE} ${delayMs}ms, transform ${ENTER_DURATION_MS}ms ${ENTER_EASE} ${delayMs}ms`,
  };
}

type HomeSlideshowBandProps = {
  slides: SlideAsset[];
};

/**
 * Home band after the last image band — scroll-driven crossfade of client renders.
 * The stage pins below the sticky header; scroll progress through the track picks the slide.
 * Each slide's `focus` keeps its watermark corner inside the 3:2 crop.
 */
export function HomeSlideshowBand({ slides }: HomeSlideshowBandProps) {
  const [progress, setProgress] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const active = Math.min(slides.length - 1, Math.floor(progress * slides.length));
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [entered, setEntered] = useState(false);
  const hidden = mounted && !reduce && !entered;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || entered) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [entered]);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const observer = new ResizeObserver(() => setHeaderHeight(header.offsetHeight));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      const scrollable = track.offsetHeight - stage.offsetHeight;
      if (scrollable <= 0) return;
      setProgress(
        Math.min(Math.max((headerHeight - track.getBoundingClientRect().top) / scrollable, 0), 1),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [slides.length, headerHeight]);

  const stageHeight = `calc(100svh - ${headerHeight}px)`;

  return (
    <section
      data-band="4"
      aria-roledescription="carousel"
      aria-label="Ali Hisa projects"
      className="w-full bg-[var(--color-surface-elevated)] px-[var(--gutter-inline)] pb-[var(--space-8)] pt-[var(--space-10)] md:pb-[var(--space-9)] md:pt-[var(--space-11)]"
    >
      <div
        ref={trackRef}
        style={{ height: `calc(${stageHeight} + ${(slides.length - 1) * SCROLL_PER_SLIDE_VH}svh)` }}
      >
        <div
          ref={stageRef}
          className="sticky flex items-center-safe overflow-hidden py-[var(--space-5)] [--frame-reserve:20rem] lg:[--frame-reserve:7rem]"
          style={
            {
              top: headerHeight,
              height: stageHeight,
              "--frame-max": `calc((${stageHeight} - var(--frame-reserve)) * 1.5)`,
            } as CSSProperties
          }
        >
          <div className="mx-auto flex w-full max-w-[60rem] flex-col lg:grid lg:max-w-[92rem] lg:grid-cols-[minmax(0,60rem)_minmax(16rem,26rem)] lg:justify-center lg:gap-x-[var(--space-10)]">
            <div
              className="mx-auto w-full max-w-[var(--frame-max)] shadow-[0_30px_60px_-30px_color-mix(in_oklch,var(--color-on-surface)_28%,transparent)] lg:col-start-1 lg:row-start-1 lg:mr-0"
              style={enterStyle(hidden, 0)}
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden bg-[var(--color-surface)]">
                {slides.map((slide, i) => {
                  const isActive = i === active;
                  const revealed = i <= active;
                  return (
                    <div
                      key={slide.src}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${i + 1} / ${slides.length}`}
                      aria-hidden={!isActive}
                      className="absolute inset-0 overflow-hidden transition-[clip-path] duration-[1800ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none"
                      style={{
                        zIndex: i,
                        clipPath: revealed ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
                      }}
                    >
                      <Image
                        src={slide.src}
                        alt={slide.alt}
                        fill
                        loading="eager"
                        sizes="(min-width: 1024px) 60vw, 100vw"
                        className="object-cover transition-transform duration-[2400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                        style={{
                          objectPosition: slide.focus ?? "50% 50%",
                          transform: isActive ? "scale(1)" : revealed ? "scale(1.04)" : "scale(1.12)",
                        }}
                      />
                    </div>
                  );
                })}
                <div
                  className="pointer-events-none absolute inset-0 z-[10] bg-[color-mix(in_oklch,var(--color-on-surface)_20%,transparent)]"
                  aria-hidden
                />
              </div>
            </div>

            <div
              className="order-3 mt-[var(--space-5)] grid md:mt-[var(--space-8)] lg:col-start-2 lg:row-start-1 lg:mt-0 lg:self-center"
              style={enterStyle(hidden, 200)}
            >
              <h2 className="sr-only">Ali Hisa projects</h2>
              {slides.map((slide, i) => {
                const isActive = i === active;
                return (
                  <div
                    key={slide.src}
                    aria-hidden={!isActive}
                    className="[grid-area:1/1] transition-[opacity,transform] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: `translateY(${isActive ? 0 : i < active ? -28 : 28}px)`,
                      transitionDelay: isActive ? "400ms" : "0ms",
                    }}
                  >
                    <p className="m-0 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-on-surface-muted)]">
                      {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                    </p>
                    <span className="mt-[var(--space-3)] block h-px w-12 bg-[var(--color-on-surface)] md:mt-[var(--space-5)]" aria-hidden />
                    <h3 className="mt-[var(--space-3)] font-[family-name:var(--font-display)] text-xl font-semibold md:mt-[var(--space-5)] md:text-2xl uppercase leading-tight tracking-[var(--tracking-display)] text-[var(--color-on-surface)] lg:text-3xl">
                      {slide.title}
                    </h3>
                    <p className="mt-[var(--space-2)] max-w-[26rem] text-base leading-relaxed md:mt-[var(--space-4)] text-[var(--color-on-surface-muted)]">
                      {slide.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {slides.length > 1 ? (
              <div
                className="order-2 mx-auto mt-[var(--space-5)] flex w-full max-w-[var(--frame-max)] justify-center gap-[var(--space-2)] lg:col-start-1 lg:row-start-2 lg:mr-0"
                style={enterStyle(hidden, 350)}
                aria-hidden
              >
                {slides.map((slide, i) => (
                  <span
                    key={slide.src}
                    className="relative block h-px w-8 overflow-hidden bg-[color-mix(in_oklch,var(--color-on-surface)_18%,transparent)]"
                  >
                    <span
                      className="absolute inset-0 origin-left bg-[var(--color-on-surface)]"
                      style={{
                        transform: `scaleX(${Math.min(Math.max(progress * slides.length - i, 0), 1)})`,
                      }}
                    />
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
