import { describe, expect, it } from "vitest";
import { allowedImageUrl } from "./product-share-image.server";

describe("social image source boundaries", () => {
  const backend = "https://catalog.example.test";
  it("rejects private networks and arbitrary destinations", () => {
    for (const url of ["https://127.0.0.1/photo.jpg", "https://169.254.169.254/", "https://evil.test/photo.jpg", "https://media-amazon.com.evil.test/photo.jpg"]) {
      expect(() => allowedImageUrl(url, backend)).toThrow();
    }
  });
  it("only accepts storage objects on the configured backend", () => {
    expect(allowedImageUrl(`${backend}/storage/v1/object/sign/product-images/cover.jpg`, backend)).toContain("/product-images/cover.jpg");
    expect(() => allowedImageUrl(`${backend}/rest/v1/profiles`, backend)).toThrow();
  });
  it("rejects credentials, HTTP and nonstandard ports", () => {
    for (const url of ["http://m.media-amazon.com/photo.jpg", "https://user:pass@m.media-amazon.com/photo.jpg", "https://m.media-amazon.com:8443/photo.jpg"]) {
      expect(() => allowedImageUrl(url, backend)).toThrow();
    }
  });
});