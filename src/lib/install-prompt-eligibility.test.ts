import { describe, expect, it } from "vitest";
import { canShowInstallPrompt } from "./install-prompt-eligibility";

describe("installation reminder eligibility", () => {
  it("never invites visitors without a connected account", () => {
    expect(canShowInstallPrompt(null, false, false)).toBe(false);
  });
  it("invites connected account holders", () => {
    expect(canShowInstallPrompt("account-id", false, false)).toBe(true);
  });
  it("preserves installation and session dismissal exclusions", () => {
    expect(canShowInstallPrompt("account-id", true, false)).toBe(false);
    expect(canShowInstallPrompt("account-id", false, true)).toBe(false);
  });
});