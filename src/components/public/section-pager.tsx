"use client";

import { useEffect } from "react";

type SectionPagerProps = { scrollContainerId: string };

// Screens where every section is designed to fit, so one wheel step can mean one section.
const PAGED_QUERY = "(min-width: 1024px) and (min-height: 760px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SLIDE_MS = 800;
// Trackpads keep emitting wheel events after the gesture ends; ignore them briefly on arrival.
const COOLDOWN_MS = 250;
const MIN_WHEEL_DELTA = 8;
const MIN_SWIPE_PX = 50;

const KEY_STEPS: Record<string, number> = {
  ArrowDown: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  PageUp: -1,
  Home: -Infinity,
  End: Infinity,
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Elements that need the wheel/keys for themselves (typing, scrolling a long message, lists).
const isInteractive = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest("input, textarea, select, [role='listbox'], [contenteditable='true']");

/**
 * Moves between the full-screen sections one at a time. During a move every section shrinks,
 * the stack slides, and the arriving section grows back to full size (styles in globals.css).
 * Renders nothing — it only drives the scroll container it is pointed at.
 */
export function SectionPager({ scrollContainerId }: SectionPagerProps) {
  useEffect(() => {
    const container = document.getElementById(scrollContainerId);
    if (!container) return;
    const pagedMedia = window.matchMedia(PAGED_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    let frame = 0;
    let lockedUntil = 0;
    let moving = false;
    let touchStartY: number | null = null;

    const panels = () => [...container.querySelectorAll<HTMLElement>("[data-panel]")];
    const isPaged = () => container.hasAttribute("data-paged");

    const currentIndex = () => {
      const tops = panels().map((panel) => Math.abs(panel.offsetTop - container.scrollTop));
      return tops.indexOf(Math.min(...tops));
    };

    const finish = () => {
      container.removeAttribute("data-moving");
      moving = false;
      lockedUntil = performance.now() + COOLDOWN_MS;
    };

    const goTo = (index: number) => {
      const list = panels();
      const target = list[Math.max(0, Math.min(list.length - 1, index))];
      if (!target || moving) return;
      const from = container.scrollTop;
      const distance = target.offsetTop - from;
      if (distance === 0) return;
      if (reducedMotion.matches) {
        container.scrollTop = target.offsetTop;
        return;
      }

      moving = true;
      container.setAttribute("data-moving", "");
      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / SLIDE_MS);
        container.scrollTop = from + distance * easeInOut(progress);
        if (progress < 1) frame = requestAnimationFrame(step);
        else finish();
      };
      frame = requestAnimationFrame(step);
    };

    const stepBy = (delta: number) => goTo(currentIndex() + delta);

    const onWheel = (event: WheelEvent) => {
      if (!isPaged() || isInteractive(event.target)) return;
      event.preventDefault();
      if (moving || performance.now() < lockedUntil || Math.abs(event.deltaY) < MIN_WHEEL_DELTA) return;
      stepBy(event.deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const delta = KEY_STEPS[event.key];
      if (!isPaged() || delta === undefined || isInteractive(event.target) || event.defaultPrevented) return;
      // Leave Space/Enter alone on buttons and links so they still activate.
      if (event.key === " " && event.target instanceof Element && event.target.closest("a, button")) return;
      // The open menu is a dialog outside the page; its keys are not ours.
      if (event.target instanceof Element && event.target.closest("[role='dialog']")) return;
      event.preventDefault();
      stepBy(delta);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = isPaged() && !isInteractive(event.target) ? event.touches[0].clientY : null;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY === null) return;
      const moved = touchStartY - event.changedTouches[0].clientY;
      touchStartY = null;
      if (Math.abs(moved) >= MIN_SWIPE_PX) stepBy(moved > 0 ? 1 : -1);
    };

    // Menu, dots and buttons are plain `#section` links; route them through the same move.
    const onClick = (event: MouseEvent) => {
      if (!isPaged() || !(event.target instanceof Element)) return;
      const hash = event.target.closest<HTMLAnchorElement>("a[href^='#']")?.getAttribute("href");
      if (!hash || hash.length < 2) return;
      const index = panels().findIndex((panel) => panel.id === hash.slice(1));
      if (index === -1) return;
      event.preventDefault();
      history.replaceState(null, "", hash);
      goTo(index);
    };

    // Keep the current section aligned when the mode or the window size changes.
    const sync = () => {
      const index = currentIndex();
      cancelAnimationFrame(frame);
      finish();
      container.toggleAttribute("data-paged", pagedMedia.matches);
      const panel = panels()[index];
      if (pagedMedia.matches && panel) container.scrollTop = panel.offsetTop;
    };

    sync();
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    pagedMedia.addEventListener("change", sync);
    window.addEventListener("resize", sync);

    return () => {
      cancelAnimationFrame(frame);
      container.removeAttribute("data-moving");
      container.removeAttribute("data-paged");
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
      pagedMedia.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [scrollContainerId]);

  return null;
}
