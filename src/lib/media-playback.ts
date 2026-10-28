export type PausableMedia = { pause: () => void };

export function createExclusivePlayback() {
  let current: PausableMedia | null = null;
  let blocked = false;
  return {
    play(media: PausableMedia) {
      if (blocked) { media.pause(); return false; }
      if (current && current !== media) current.pause();
      current = media;
      return true;
    },
    release(media: PausableMedia) { if (current === media) current = null; },
    stop() { current?.pause(); current = null; },
    block(value: boolean) { blocked = value; if (value) this.stop(); },
  };
}

export function canPlayMedia(active: boolean, visible: boolean, inView: boolean) {
  return active && visible && inView;
}