import { describe, expect, it } from "vitest";

import { escapeHtml, wrapEmailHtml } from "@/lib/email-html";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<b>Tom & "Jerry's" <script>`)).toBe(
      "&lt;b&gt;Tom &amp; &quot;Jerry&#39;s&quot; &lt;script&gt;",
    );
  });
});

describe("wrapEmailHtml", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");

  it("uses the logo when set, and escapes it", () => {
    const html = wrapEmailHtml({
      studioName: "Malhaar Dance Company",
      logoUrl: "https://example.com/logo.png",
      primaryColor: "#9B1B5E",
      bodyText: "Hi Anu,\n\nWelcome!",
      now,
    });
    expect(html).toContain('<img src="https://example.com/logo.png"');
    expect(html).not.toContain(">Malhaar Dance Company</span>");
  });

  it("falls back to the studio name when there's no logo", () => {
    const html = wrapEmailHtml({
      studioName: "Malhaar Dance Company",
      logoUrl: null,
      primaryColor: "#9B1B5E",
      bodyText: "Hi Anu,",
      now,
    });
    expect(html).toContain(">Malhaar Dance Company</span>");
  });

  it("applies the theme color to the header cell", () => {
    const html = wrapEmailHtml({ studioName: "Studio", logoUrl: null, primaryColor: "#123456", bodyText: "Hi.", now });
    expect(html).toContain("background-color:#123456");
  });

  it("splits body text into paragraphs on blank lines and escapes each one", () => {
    const html = wrapEmailHtml({
      studioName: "Studio",
      logoUrl: null,
      primaryColor: "#123456",
      bodyText: "Hi <Anu>,\n\nSecond paragraph.",
      now,
    });
    expect(html).toContain("<p style=\"margin:0 0 16px;white-space:pre-line;\">Hi &lt;Anu&gt;,</p>");
    expect(html).toContain("<p style=\"margin:0 0 16px;white-space:pre-line;\">Second paragraph.</p>");
  });

  it("includes the current (injected) year in the footer", () => {
    const html = wrapEmailHtml({ studioName: "Studio", logoUrl: null, primaryColor: "#123456", bodyText: "Hi.", now });
    expect(html).toContain("© 2026 Studio");
  });
});
