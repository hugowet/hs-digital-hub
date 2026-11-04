/** Each visible viewing period starts with a full five seconds. */
export function createCarouselAutoplay(advance: () => void) {
  let timer: ReturnType<typeof setInterval> | undefined;
  return {
    setActive(active: boolean) {
      if (!active) {
        clearInterval(timer);
        timer = undefined;
      } else if (timer === undefined) {
        timer = setInterval(advance, 5000);
      }
    },
    dispose() {
      clearInterval(timer);
      timer = undefined;
    },
  };
}