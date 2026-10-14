import { describe, expect, it } from "vitest";

import { getPortalAuthCookies } from "@/lib/portal-auth-cookies";

describe("portal authentication cookies", () => {
  it("uses independent names for the Admin and Content session tokens", () => {
    const adminSession = getPortalAuthCookies("admin").sessionToken.name;
    const contentSession = getPortalAuthCookies("content").sessionToken.name;

    expect(adminSession).not.toBe(contentSession);
    expect(adminSession).toContain("malhaar-admin");
    expect(contentSession).toContain("malhaar-content");
  });

  it("keeps all Auth.js helper cookies separate between portals", () => {
    const adminCookies = getPortalAuthCookies("admin");
    const contentCookies = getPortalAuthCookies("content");

    expect(Object.values(adminCookies).map((cookie) => cookie.name)).not.toEqual(
      Object.values(contentCookies).map((cookie) => cookie.name),
    );
  });

  it("keeps session tokens HTTP-only while allowing Auth.js to read its CSRF token", () => {
    const cookies = getPortalAuthCookies("content");

    expect(cookies.sessionToken.options.httpOnly).toBe(true);
    expect(cookies.csrfToken.options.httpOnly).toBe(false);
  });
});
