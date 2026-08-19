import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

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

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Release the local `pg` pool. Only needed so test runners can exit cleanly. */
export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
  cached = null;
}
