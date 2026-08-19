/** Regenerates db/001_init.sql from src/lib/schema.ts. Run: npm run db:sql */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderSchemaSql } from '../src/lib/schema';

const out = resolve(__dirname, '..', 'db', '001_init.sql');
writeFileSync(out, renderSchemaSql());
console.log(`wrote ${out}`);
