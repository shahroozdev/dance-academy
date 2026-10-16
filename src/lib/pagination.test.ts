import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE, parsePageParams } from "@/lib/pagination";

describe("parsePageParams", () => {
  it("reads valid page and page size values from the URL", () => {
    expect(parsePageParams({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
  });

  it("falls back to page 1 and the default size for missing, invalid or out-of-range values", () => {
    expect(parsePageParams({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePageParams({ page: "0", pageSize: "-5" })).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePageParams({ page: "2.5", pageSize: "abc" })).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePageParams({ page: null, pageSize: "101" })).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });
});
