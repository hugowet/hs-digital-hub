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
    <div role="dialog" aria-label="Crie sua conta na HS Digital" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl animate-in slide-in-from-bottom-4">
      <button type="button" onClick={close} aria-label="Fechar" className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      <div className="flex gap-3 pr-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Gift className="h-5 w-5" /></span>
        <div>
          <p className="font-bold leading-tight">Crie sua conta grátis na HS Digital</p>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe seus pedidos, salve seu endereço e ganhe cupons de frete nos jogos.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button asChild className="flex-1"><Link to="/auth" onClick={close}>Criar conta</Link></Button>
        <Button variant="outline" onClick={close}>Agora não</Button>
      </div>
    </div>
  );
}
