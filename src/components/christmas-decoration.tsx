import { useEffect, useState } from "react";
import { CHRISTMAS_END, isChristmasSeason } from "@/lib/christmas-season";

export function useChristmasDecoration(enabled: boolean) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!enabled) { setActive(false); return; }
    const refresh = () => setActive(isChristmasSeason());
    refresh();
    // Recheck when a sleeping tab returns; also remove during an open session.
    const interval = window.setInterval(refresh, 30_000);
    const remaining = CHRISTMAS_END - Date.now();
    const timeout = remaining > 0 && remaining <= 2_147_483_647
      ? window.setTimeout(refresh, remaining) : undefined;
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      if (timeout !== undefined) window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled]);
  return active;
}

export function ChristmasHat() {
  return (
    <svg className="hs-christmas-hat" viewBox="0 0 64 48" aria-hidden="true" focusable="false">
      <path className="hs-hat-red" d="M10 35C13 21 26 5 38 6c10 0 16 9 15 21-4-7-9-10-14-9l7 18Z" />
      <path className="hs-hat-trim" d="M10 32c11-3 25-3 36 0l-1 11c-12-3-24-3-36 0Z" />
      <circle className="hs-hat-trim" cx="53" cy="27" r="7" />
    </svg>
  );
}

export function ChristmasDecoration() {
  return (
    <div aria-hidden="true" className="hs-christmas-decoration">
      <div className="hs-christmas-lights">
        {Array.from({ length: 32 }, (_, i) => <span key={i} className="hs-christmas-bulb" />)}
      </div>
      <div className="hs-christmas-snow">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className="hs-snowflake" style={{ left: `${(i * 37 + 3) % 100}%`, animationDelay: `${-(i * 1.7)}s`, animationDuration: `${16 + (i % 5) * 3}s` }}>
            {i % 3 === 0 ? "❄" : "·"}
          </span>
        ))}
      </div>
    </div>
  );
}