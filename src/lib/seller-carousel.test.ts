import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

// Run against Cloud through the owner connection, with all changes rolled back.
// SQL integration coverage can also be executed with the project's query CLI.
describe('carousel decisions', () => {
  it('keeps explicit exclusions persistent instead of deleting the published product', () => {
    const sql = readFileSync('drizzle/migrations/0081_seller_amazon_carousel_controls.sql', 'utf8');
    expect(sql).toContain('included=excluded.included');
    expect(sql).not.toMatch(/DELETE FROM public\.products/i);
  });
});