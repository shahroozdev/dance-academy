import { describe, expect, it } from "vitest";

import {
  eventStartIso,
  formatEventDate,
  formatEventTime,
  isVideoFile,
  parseDateInput,
  slugify,
  splitParagraphs,
  toDateInput,
  videoEmbedUrl,
} from "@/lib/content-format";

describe("festival dates and times", () => {
  const festivalDay = parseDateInput("2026-10-25");

  it("shows the calendar date that was entered, whatever the server's time zone", () => {
    expect(formatEventDate(festivalDay)).toBe("Sunday, October 25, 2026");
    expect(toDateInput(festivalDay)).toBe("2026-10-25");
  });

  it.each([
    ["15:00", "3:00 PM"],
    ["00:30", "12:30 AM"],
    ["12:05", "12:05 PM"],
    ["09:00", "9:00 AM"],
  ])("shows %s as %s", (time, label) => {
    expect(formatEventTime(time)).toBe(label);
  });

  it("gives search engines the start with the studio's UTC offset for that day", () => {
    // Daylight time is still in effect on October 25 and has ended by December.
    expect(eventStartIso(festivalDay, "15:00")).toBe("2026-10-25T15:00:00-05:00");
    expect(eventStartIso(parseDateInput("2026-12-05"), "18:30")).toBe("2026-12-05T18:30:00-06:00");
  });
});

describe("text helpers", () => {
  it("makes a page address from a title", () => {
    expect(slugify("  Spring Showcase — 2027! ")).toBe("spring-showcase-2027");
    expect(slugify("Nṛtya Sandhyā")).toBe("nrtya-sandhya");
    expect(slugify("!!!")).toBe("");
  });

  it("splits free text into paragraphs on blank lines", () => {
    expect(splitParagraphs("First.\n\n  Second line one\nline two.  \n\n\n")).toEqual(["First.", "Second line one\nline two."]);
    expect(splitParagraphs(null)).toEqual([]);
  });
});

describe("videos", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/abc_DEF-123", "https://www.youtube-nocookie.com/embed/abc_DEF-123"],
    ["https://vimeo.com/123456789", "https://player.vimeo.com/video/123456789"],
  ])("embeds %s", (url, embed) => {
    expect(videoEmbedUrl(url)).toBe(embed);
  });

  it("does not try to embed other links", () => {
    expect(videoEmbedUrl("https://example.com/watch/1")).toBeNull();
  });

  it("recognises a video file by its extension", () => {
    expect(isVideoFile("https://files.example.com/reel.mp4?download=1")).toBe(true);
    expect(isVideoFile("https://example.com/page")).toBe(false);
  });
});
