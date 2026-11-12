import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "hs-signup-invite-dismissed";

/** Invites visitors without an account to sign up; hidden for signed-in users. */
export function SignupInvite() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const timer = window.setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => { if (active && !data.session) setShow(true); });
    }, 2500);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setShow(false); });
    return () => { active = false; window.clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  if (!show) return null;
  const close = () => { sessionStorage.setItem(DISMISS_KEY, "1"); setShow(false); };

  return (
    <div role="dialog" aria-label="Crie sua conta na HS Digital" className="fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-xs rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xl animate-in slide-in-from-bottom-2 motion-reduce:animate-none">
      <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Fechar" className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>
      <div className="flex gap-2 pr-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Gift className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Crie sua conta grátis na HS Digital</p>
          <p className="mt-1 text-xs text-muted-foreground">Acompanhe seus pedidos, salve seu endereço e ganhe cupons de frete nos jogos.</p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Button asChild size="sm" className="flex-1 text-xs"><Link to="/auth" onClick={close}>Criar conta</Link></Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={close}>Agora não</Button>
      </div>
    </div>
  );
}
