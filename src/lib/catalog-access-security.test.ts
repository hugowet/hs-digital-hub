import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(new URL(`../../drizzle/migrations/${name}`, import.meta.url), "utf8");
}

describe("catalog and media access hardening", () => {
  it("keeps seller and admin checks away from anonymous product reads", () => {
    const sql = migration("0105_restore_public_product_visibility.sql");
    expect(sql).toMatch(/ALTER POLICY "seller reads own products"[\s\S]*?TO authenticated/);
    expect(sql).toContain("s.owner_id = (SELECT auth.uid())");
    expect(sql).not.toMatch(/active products are public/i);
  });

  it("blocks browser roles from the unused dynamic catalog search", () => {
    const sql = migration("0106_restrict_legacy_catalog_search_execution.sql");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.search_catalog_ids");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("TO service_role");
    expect(sql).not.toMatch(/GRANT EXECUTE[\s\S]*?TO anon/);
  });

  it("shares published trend media only with its verified owner", () => {
    const sql = migration("0107_bind_published_trend_media_to_owner.sql");
    expect(sql).toContain("TO authenticated");
    expect(sql).toContain("owner_id = (SELECT auth.uid()::text)");
    expect(sql).toContain("v.is_published");
    expect(sql).toContain("owner_id = v.user_id::text");
    expect(sql).toContain("split_part(objects.name, '/', 1) = v.user_id::text");
    expect(sql).toContain("v.video_url = objects.name OR v.audio_path = objects.name");
  });
});
