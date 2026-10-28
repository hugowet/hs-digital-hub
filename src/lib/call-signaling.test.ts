import { describe, expect, it } from "vitest";
import { callErrorMessage, createSignalQueue } from "./call-signaling";

describe("call signaling", () => {
  it("finishes SDP before handling candidates arriving during negotiation", async () => {
    const enqueue = createSignalQueue();
    const events: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const sdp = enqueue(async () => { events.push("sdp-start"); await gate; events.push("sdp-ready"); });
    const ice = enqueue(async () => { events.push("ice"); });
    await Promise.resolve();
    expect(events).toEqual(["sdp-start"]);
    release();
    await Promise.all([sdp, ice]);
    expect(events).toEqual(["sdp-start", "sdp-ready", "ice"]);
  });
  it("does not strand hangup after a failed candidate", async () => {
    const enqueue = createSignalQueue();
    await expect(enqueue(async () => { throw new Error("candidate failed"); })).rejects.toThrow("candidate failed");
    await expect(enqueue(async () => "ended")).resolves.toBe("ended");
  });
  it("does not mislabel network failures as microphone permission failures", () => {
    expect(callErrorMessage(new Error("broadcast timeout"))).toContain("internet");
    const permission = new Error(); permission.name = "NotAllowedError";
    expect(callErrorMessage(permission)).toContain("Permita");
  });
});