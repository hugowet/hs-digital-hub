import { useEffect, useState } from "react";
import { Crown, Users, Gamepad2, Radio, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import lupiCart from "@/assets/lupi-full-shopping-cart.png";

const INTRO_SESSION_KEY = "hs-digital-intro-seen";
const HIGHLIGHTS = [
  { title: "Clube HS", text: "Sua experiência HS vai além das compras.", icon: Crown },
  { title: "Afiliados HS", text: "Compartilhe a HS Digital. Conheça nosso programa de afiliados.", icon: Users },
  { title: "Jogos & Prêmios", text: "Junte moedas e conquiste cupons de desconto no frete!", icon: Gamepad2, buyerOnly: true },
  { title: "Rádio HS", text: "Dê play na sua música. Continue curtindo enquanto compra.", icon: Radio },
];

export function IntroAnimation() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(-1);
  const [isBuyer, setIsBuyer] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      if (active) setIsBuyer(Boolean(roles?.some((r) => r.role === "buyer") && !roles?.some((r) => r.role === "seller")));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY)) return;

    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    setVisible(true);
  }, []);

  const highlights = HIGHLIGHTS.filter((item) => !item.buyerOnly || isBuyer);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      if (step >= highlights.length - 1) setVisible(false);
      else setStep((previous) => previous + 1);
    }, step < 0 ? 3_000 : 2_600);
    return () => window.clearTimeout(timer);
  }, [visible, step, highlights.length]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-ink" aria-label="Apresentação HS Digital">
      <Button variant="ghost" className="absolute right-4 top-4 z-10 text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground" onClick={() => setVisible(false)}>
        Entrar na loja <ArrowRight className="size-4" />
      </Button>
      {step < 0 ? <>
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
      </> : highlights[step] && (() => {
        const highlight = highlights[step];
        if (!highlight) return null;
        const Icon = highlight.icon;
        return <div key={highlight.title} className="intro-highlight absolute inset-0 flex flex-col items-center justify-center px-7 text-center" aria-live="polite">
          <p className="mb-8 text-xs font-bold uppercase text-ink-foreground/60">HS Digital Marketplace</p>
          <Icon className="mb-6 size-14 text-primary-glow" aria-hidden="true" />
          <h2 className="text-3xl font-extrabold text-ink-foreground sm:text-5xl">{highlight.title}</h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-foreground/80 sm:text-xl">{highlight.text}</p>
          <div className="mt-10 flex gap-2" aria-hidden="true">
            {highlights.map((item, index) => <span key={item.title} className={`h-1 w-8 rounded-full ${index === step ? "bg-primary-glow" : "bg-ink-foreground/20"}`} />)}
          </div>
        </div>;
      })()}
    </div>
  );
}
