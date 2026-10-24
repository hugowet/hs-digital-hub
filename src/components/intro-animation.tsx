import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import lupiCart from "@/assets/lupi-full-shopping-cart.png";

const INTRO_SESSION_KEY = "hs-digital-intro-seen";

export function IntroAnimation() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY)) return;

    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 3_400);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-ink" aria-label="Apresentação HS Digital">
      <Button variant="ghost" className="absolute right-4 top-4 z-10 text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground" onClick={() => setVisible(false)}>
        Entrar na loja <ArrowRight className="size-4" />
      </Button>
      <div className="intro-lupi absolute left-0 w-[min(88vw,760px)]">
        <img
          src={lupiCart}
          alt="Lupi empurrando um carrinho cheio de compras"
          className="h-auto w-full object-contain"
          decoding="async"
          fetchPriority="high"
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
