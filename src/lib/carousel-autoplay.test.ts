import { afterEach, describe, expect, it, vi } from "vitest";
import { createCarouselAutoplay } from "./carousel-autoplay";

afterEach(() => vi.useRealTimers());

describe("visible carousel autoplay", () => {
  it("waits five seconds from viewing, not page opening", () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const timer = createCarouselAutoplay(advance);
    vi.advanceTimersByTime(15000);
    expect(advance).not.toHaveBeenCalled();
    timer.setActive(true);
    vi.advanceTimersByTime(4999);
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(advance).toHaveBeenCalledTimes(1);
    timer.dispose();
  });

  it("does not count offscreen and restarts five seconds upon returning", () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const timer = createCarouselAutoplay(advance);
    timer.setActive(true);
    vi.advanceTimersByTime(3000);
    timer.setActive(false);
    vi.advanceTimersByTime(20000);
    expect(advance).not.toHaveBeenCalled();
    timer.setActive(true);
    vi.advanceTimersByTime(4999);
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(advance).toHaveBeenCalledTimes(1);
    timer.dispose();
  });
});