"use client";

import { useEffect, useState } from "react";

import { HOME_SECTIONS, type HomeSectionId } from "@/lib/public-site";
import { cn } from "@/lib/utils";

type SectionDotsProps = { scrollContainerId: string };

// Right-edge dot navigator: one dot per full-screen section, the visible one filled in.
export function SectionDots({ scrollContainerId }: SectionDotsProps) {
  const [activeId, setActiveId] = useState<HomeSectionId>(HOME_SECTIONS[0].id);

  useEffect(() => {
    const root = document.getElementById(scrollContainerId);
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id as HomeSectionId);
      },
      // A thin band across the middle of the viewport: whichever section crosses it is current,
      // which also works for sections taller than the screen.
      { root, rootMargin: "-50% 0px -50% 0px" },
    );
    root.querySelectorAll("[data-panel]").forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, [scrollContainerId]);

  return (
    <nav aria-label="Sections" className="absolute top-1/2 right-6 z-20 hidden -translate-y-1/2 lg:block">
      <ul className="flex flex-col gap-1">
        {HOME_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-label={section.label}
              aria-current={activeId === section.id ? "true" : undefined}
              title={section.label}
              className="group flex size-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  "size-2.5 rounded-full transition-colors group-hover:bg-primary",
                  activeId === section.id ? "bg-foreground/70" : "bg-foreground/25",
                )}
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
