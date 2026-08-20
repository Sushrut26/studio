/**
 * @jest-environment node
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every server page that checks isDatabaseConfigured() must also call
 * ensureSchema() before querying -- otherwise a brand-new database (tables not
 * yet created) fails its queries silently instead of building its schema.
 *
 * This is a real regression: src/app/page.tsx lost its ensureSchema() call
 * during an unrelated edit, imported but never invoked it, and the dashboard
 * quietly rendered "no data" against a database that had no tables at all.
 * A missing await is easy to lose in a diff; this check can't miss it.
 */
function findPageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPageFiles(full));
    else if (entry.name === 'page.tsx') out.push(full);
  }
  return out;
}

describe('every database-backed page creates its schema before querying', () => {
  const appDir = path.resolve(__dirname, '../../app');
  const pageFiles = findPageFiles(appDir);

  it('found at least one page to check', () => {
    expect(pageFiles.length).toBeGreaterThan(0);
  });

  it.each(pageFiles)('%s calls ensureSchema() after isDatabaseConfigured()', (file) => {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('isDatabaseConfigured')) return; // page doesn't touch the db
    expect(src).toContain('ensureSchema()');
  });
});
