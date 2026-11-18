import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../drizzle/migrations/0101_scope_trends_publication_and_file_reads.sql", import.meta.url),
  "utf8",
);

describe("Trends publication and media access migration", () => {
  it("preserves existing publications and scopes unpublished reads to their author", () => {
    expect(sql).toContain("is_published boolean NOT NULL DEFAULT true");
    expect(sql).toContain("USING (is_published OR user_id = (SELECT auth.uid()))");
    expect(sql).not.toMatch(/USING\s*\(true\)/i);
  });

  it("requires publication and author-owned paths for shared file reads", () => {
    expect(sql).toContain("TO authenticated");
    expect(sql).toContain("owner_id = (SELECT auth.uid()::text)");
    expect(sql).toContain("WHERE v.is_published");
    expect(sql).toContain("split_part(objects.name, '/', 1) = v.user_id::text");
    expect(sql).toContain("v.video_url = objects.name OR v.audio_path = objects.name");
  });

  it("changes only the two selected policies", () => {
    const policies = [...sql.matchAll(/ALTER POLICY (\w+)/g)].map(match => match[1]);
    expect(policies).toEqual(["trend_videos_public_read", "trend_videos_storage_read"]);
    expect(sql).not.toMatch(/DROP POLICY|CREATE POLICY|DELETE FROM|UPDATE public\./i);
  });
});