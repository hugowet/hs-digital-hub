import { describe, expect, it } from "vitest";
import { classifyAudienceDevice, audienceLocation } from "./audience-device";

describe("audience device", () => {
  it("preserves the actual country supplied by hosting", () => {
    expect(audienceLocation({ country: "BR" }).country).toBe("BR");
  });
  it("preserves the approximate city supplied by hosting", () => {
    expect(audienceLocation({ city: "Boa Vista" }).city).toBe("Boa Vista");
  });
  it("does not invent a location for historical or local visits", () => {
    expect(audienceLocation({})).toEqual({ country: null, city: null, region: null });
  });
  it("counts an iPhone visit as mobile", () => {
    expect(classifyAudienceDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile")).toBe("mobile");
  });
  it("counts an iPad visit as tablet", () => {
    expect(classifyAudienceDevice("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
  });
  it("counts a Windows browser visit as desktop", () => {
    expect(classifyAudienceDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130")).toBe("desktop");
  });
});
