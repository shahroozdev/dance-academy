"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Slide = { src: string; alt: string };

type SlideshowProps = {
  slides: readonly Slide[];
  /** Names the slideshow for screen readers, e.g. "Performance photos". */
  label: string;
  className?: string;
};

const AUTOPLAY_MS = 5000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const ARROW_CLASS =
  "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center bg-background/85 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Shows one photo at a time. The track is an ordinary sideways-scrolling row that snaps to each
 * slide, so swiping on a phone works natively; the arrows, dots, arrow keys and the automatic
 * advance all just scroll it. Every photo stays in the page as a real image, so search engines
 * still see all of them.
 */
export function Slideshow({ slides, label, className }: SlideshowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (target: number) => {
      const track = trackRef.current;
      if (!track) return;
      // Wraps around at both ends. The wrap itself jumps straight there; sliding back through
      // every photo in between would be a long, distracting blur.
      const wraps = target < 0 || target >= slides.length;
      const next = (target + slides.length) % slides.length;
      const instant = wraps || window.matchMedia(REDUCED_MOTION_QUERY).matches;
      track.scrollTo({ left: next * track.clientWidth, behavior: instant ? "auto" : "smooth" });
    },
    [slides.length],
  );

  // The scroll position is the source of truth, so swiping updates the dots too.
  const syncIndex = useCallback(() => {
    const track = trackRef.current;
    if (track && track.clientWidth > 0) setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }, []);

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const timer = window.setInterval(() => goTo(index + 1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [goTo, index, paused, slides.length]);

  const stepKeys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("flex flex-col gap-4", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        const step = stepKeys[event.key];
        if (step === undefined) return;
        event.preventDefault();
        goTo(index + step);
      }}
    >
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={syncIndex}
          className="flex snap-x snap-mandatory overflow-x-auto bg-foreground shadow-xl scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${slides.length}`}
              className="relative aspect-4/3 w-full shrink-0 snap-center sm:aspect-3/2"
            >
              {/* Shown whole, not cropped: the photos vary from wide stage shots to tall portraits. */}
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(min-width: 1024px) 56rem, 100vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous photo" className={cn(ARROW_CLASS, "left-0")}>
          <ChevronLeft className="size-6" strokeWidth={1.5} />
        </button>
        <button type="button" onClick={() => goTo(index + 1)} aria-label="Next photo" className={cn(ARROW_CLASS, "right-0")}>
          <ChevronRight className="size-6" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => goTo(slideIndex)}
            aria-label={`Show photo ${slideIndex + 1}`}
            aria-current={slideIndex === index ? "true" : undefined}
            className="group flex size-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span
              className={cn(
                "size-2.5 rounded-full transition-colors group-hover:bg-primary",
                slideIndex === index ? "bg-foreground/70" : "bg-foreground/25",
              )}
            />
          </button>
        ))}
      </div>
      <p className="text-center font-public text-sm text-muted-foreground" aria-live="polite">
        {slides[index]?.alt}
      </p>
    </section>
  );
}
