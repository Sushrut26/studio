import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SCHEMA_STATEMENTS, renderSchemaSql } from '@/lib/schema';

describe('schema', () => {
  it('keeps the generated db/001_init.sql in sync with schema.ts', () => {
    const committed = readFileSync(resolve(process.cwd(), 'db/001_init.sql'), 'utf8');
    // If this fails, run: npm run db:sql
    expect(committed).toBe(renderSchemaSql());
  });

  it('creates every table the queries rely on', () => {
    const sql = SCHEMA_STATEMENTS.join('\n');
    for (const table of [
      'imports',
      'keys',
      'tickets',
      'ticket_key_occurrences',
      'lists',
      'list_items',
    ]) {
      expect(sql).toContain(`create table if not exists ${table}`);
    }
  });

  // The app runs this automatically against whatever database it is pointed at,
  // so a destructive statement slipping in would be genuinely dangerous.
  it('contains no destructive statements', () => {
    for (const statement of SCHEMA_STATEMENTS) {
      expect(statement).not.toMatch(/\b(drop|truncate|delete\s+from|alter\s+table)\b/i);
    }
  });

  it('guards every statement with IF NOT EXISTS', () => {
    for (const statement of SCHEMA_STATEMENTS) {
      expect(statement).toMatch(/if not exists/i);
    }
  });
});
