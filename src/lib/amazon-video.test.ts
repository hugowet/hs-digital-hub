import { describe, expect, it } from "vitest";
import { amazonVideosFromHtml } from "./amazon-image";

describe("amazonVideosFromHtml", () => {
  it("reads the listing's own video and prefers mp4", () => {
    const html = `"videos": [{"title":"x","url":"https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/a/default.jobtemplate.hls.m3u8","mp4":"https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/a/default.mp4"}], "other":"https://m.media-amazon.com/images/S/z/rel.mp4"`;
    expect(amazonVideosFromHtml(html)).toEqual([
      "https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/a/default.mp4",
      "https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/a/default.jobtemplate.hls.m3u8",
    ]);
  });
  it("returns nothing when the listing has no videos", () => {
    expect(amazonVideosFromHtml(`"videos": [], "x":"https://m.media-amazon.com/images/S/rel.mp4"`)).toEqual([]);
  });
});
