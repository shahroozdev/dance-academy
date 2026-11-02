import { describe, expect, it } from "vitest";

import { DB_POOL_MAX, dbPoolConfig } from "@/lib/db-pool";

describe("dbPoolConfig", () => {
  it("caps each server instance's connections well below the database role's limit of 45", () => {
    const config = dbPoolConfig("postgres://example");
    expect(config).toMatchObject({ connectionString: "postgres://example", max: DB_POOL_MAX });
    expect(DB_POOL_MAX).toBeLessThanOrEqual(5);
    expect(config.idleTimeoutMillis).toBeLessThanOrEqual(5_000);
    expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
  });
});
