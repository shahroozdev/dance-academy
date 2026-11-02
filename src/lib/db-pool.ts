import type { PoolConfig } from "pg";

// Connections one server instance may hold. The hosted database lets this app's role open 45 in
// total, and Vercel keeps several instances warm at once; pg's default of 10 per instance let a
// handful of instances exhaust the limit (2026-10-17 "Too many database connections"). Queries
// beyond this number wait for a free connection instead of failing.
export const DB_POOL_MAX = 5;

export function dbPoolConfig(connectionString: string | undefined): PoolConfig {
  return {
    connectionString,
    max: DB_POOL_MAX,
    // Hand idle connections back quickly so a quiet instance does not keep them reserved.
    idleTimeoutMillis: 5_000,
    // Wait up to 15s for a free connection rather than hanging indefinitely.
    connectionTimeoutMillis: 15_000,
  };
}
