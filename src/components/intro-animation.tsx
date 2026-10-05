import { useEffect, useState } from "react";

import lupiCart from "@/assets/lupi-full-shopping-cart.png";

const INTRO_SESSION_KEY = "hs-digital-intro-seen";
const INTRO_DURATION_MS = 184_000;

export function IntroAnimation() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY)) return;

    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), INTRO_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="intro-stage fixed inset-0 z-[100] overflow-hidden bg-ink" aria-label="Apresentação HS Digital">
      <div className="intro-lupi absolute left-0 top-1/2 w-[min(88vw,760px)] -translate-y-1/2">
        <img
          src={lupiCart}
          alt="Lupi empurrando um carrinho cheio de compras"
          className="h-auto w-full object-contain"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="intro-title text-3xl font-extrabold text-ink-foreground sm:text-5xl md:text-7xl">
            HS Digital <span className="text-primary-glow">Marketplace</span>
          </h1>
          <p className="intro-tagline mt-4 text-base font-semibold text-ink-foreground/80 sm:text-xl md:text-2xl">
            Evoluindo com tecnologia
          </p>
        </div>
      </div>
    </div>
  );
}