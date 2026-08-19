import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import { SCHEMA_PROBE, SCHEMA_STATEMENTS } from './schema';

/**
 * A tagged-template query function. Both backends below implement this same
 * shape, so nothing above this file knows or cares which one is in use.
 */
export type SqlTag = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

let cached: SqlTag | null = null;
let pool: Pool | null = null;

/** Neon's HTTP driver only speaks to Neon endpoints; anything else is plain Postgres. */
function isNeonUrl(url: string): boolean {
  return /\.neon\.tech|neon\.build|pooler\.[^/]*neon/i.test(url);
}

/**
 * Postgres client.
 *
 * On Vercel this resolves to Neon's HTTP driver: every route handler is a
 * short-lived serverless function, so there is no connection to leak and no
 * pool to exhaust. Pointed at any other Postgres URL -- a local server, Docker,
 * a self-hosted instance -- it falls back to a pooled `pg` client instead, so
 * the app runs locally without a Neon account.
 */
export function getSql(): SqlTag {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and add your Postgres connection string.'
    );
  }

  if (isNeonUrl(url)) {
    cached = neon(url) as unknown as SqlTag;
    return cached;
  }

  pool ??= new Pool({
    connectionString: url,
    max: 5,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  cached = (async <T,>(strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''), '');
    const result = await pool!.query(text, values as unknown[]);
    return result.rows as T[];
  }) as SqlTag;

  return cached;
}

/**
 * Wrap a complete SQL string as a no-substitution template literal.
 *
 * Both drivers are tagged-template-only (Neon's HTTP client exposes no
 * `.query()`), so a statement built elsewhere has to be handed over in this
 * shape. Only ever call this with SQL we author -- never with user input, which
 * belongs in an interpolated value where it gets parameterized.
 */
function asTemplate(statement: string): TemplateStringsArray {
  const parts = [statement] as unknown as { raw: string[] } & string[];
  parts.raw = [statement];
  return parts as unknown as TemplateStringsArray;
}

let schemaReady: Promise<void> | null = null;

/**
 * Create the schema if it is missing, once per process.
 *
 * This is why pasting a DATABASE_URL is all the setup there is -- no psql step,
 * locally or on a fresh deploy. It probes for one table first, so a warm
 * process pays a single cheap query rather than replaying every DDL statement.
 * All statements are IF NOT EXISTS and none drops or alters anything, so
 * pointing this at an existing database cannot damage it.
 */
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const sql = getSql();
    const probe = await sql<{ present: string | null }>(asTemplate(SCHEMA_PROBE)).catch(() => null);
    if (probe?.[0]?.present) return;

    for (const statement of SCHEMA_STATEMENTS) {
      await sql(asTemplate(statement));
    }
  })().catch((error) => {
    // Don't cache a failure: a transient outage should not poison the process.
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

/** Run `fn` with the schema guaranteed to exist. Entry point for routes and pages. */
export async function withDb<T>(fn: (sql: SqlTag) => Promise<T>): Promise<T> {
  await ensureSchema();
  return fn(getSql());
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Release the local `pg` pool. Only needed so test runners can exit cleanly. */
export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
  cached = null;
  schemaReady = null;
}
