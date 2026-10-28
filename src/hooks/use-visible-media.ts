import { useEffect, useRef, useState } from "react";
import { canPlayMedia } from "@/lib/media-playback";

// Owns pending play requests too: a delayed canplay/rejection cannot revive hidden media.
export function useVisibleMedia<T extends HTMLMediaElement>(src: string, active: boolean, muted: boolean) {
  const ref = useRef<T | null>(null);
  const toggleRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const media = ref.current;
    if (!media) return;
    let disposed = false, inView = false, manualPause = false, generation = 0;
    const allowed = () => !disposed && !manualPause && canPlayMedia(active, document.visibilityState === "visible", inView);
    const stop = () => { generation++; media.pause(); setPlaying(false); };
    const start = async () => {
      if (!allowed()) { stop(); return; }
      const request = ++generation;
      media.muted = muted;
      try { await media.play(); }
      catch {
        if (request !== generation || !allowed()) return;
        media.muted = true;
        try { await media.play(); } catch { if (!disposed) setPlaying(false); return; }
      }
      if (request !== generation || !allowed()) { if (!allowed()) media.pause(); return; }
      setPlaying(true);
    };
    const sync = () => { if (allowed()) void start(); else stop(); };
    const onPlay = () => { if (!allowed()) stop(); else setPlaying(true); };
    const onPause = () => { if (!disposed) setPlaying(false); };
    const observer = new IntersectionObserver(([entry]) => { inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5); sync(); }, { threshold: [0, 0.5] });
    observer.observe(media);
    media.addEventListener("canplay", sync);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", stop);
    toggleRef.current = () => { manualPause = !media.paused; sync(); };
    sync();
    return () => {
      disposed = true; generation++; media.pause(); observer.disconnect();
      media.removeEventListener("canplay", sync); media.removeEventListener("play", onPlay); media.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", sync); window.removeEventListener("pagehide", stop);
      toggleRef.current = () => {};
    };
  }, [src, active, muted]);
  return { ref, playing, toggle: () => toggleRef.current() };
}