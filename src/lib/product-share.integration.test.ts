import { describe, expect, it } from "vitest";

describe("manual product share preview", () => {
  const id = "dd9e5cf6-69e3-4551-8e5f-e3082ba5ea3c";
  it("uses a stable cover address rather than an expiring storage signature", async () => {
    const response = await fetch(`http://localhost:8080/produto/${id}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    const image = html.match(/property="og:image"[^>]*content="([^"]+)"/);
    expect(image?.[1]).toBe(`https://hs-digital-marck.lovable.app/api/public/product-share/${id}`);
  }, 60000);
  it("serves the real manual cover as a JPEG without signing in", async () => {
    const response = await fetch(`http://localhost:8080/api/public/product-share/${id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 2)]).toEqual([255, 216]);
    expect(bytes.length).toBeGreaterThan(10000);
  }, 60000);
});