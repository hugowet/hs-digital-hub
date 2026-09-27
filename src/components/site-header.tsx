import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, Menu, Search, ShoppingCart, Store, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import logoAsset from "@/assets/hs-digital-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/carrinho", label: "Carrinho" },
  { to: "/vendedor", label: "Seller Center" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteHeader({
  query,
  onQueryChange,
  suggestions = [],
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
  suggestions?: Array<{ id: string; title: string; category: string }>;
}) {
  const { count } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const matches = useMemo(() => {
    const normalized = (query ?? "").trim().toLowerCase();
    if (!normalized) return suggestions.slice(0, 5);
    return suggestions
      .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(normalized))
      .slice(0, 5);
  }, [query, suggestions]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setSignedIn(!!session?.user);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 brand-gradient text-primary-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src={logoAsset.url}
              alt="HS Digital"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full ring-1 ring-white/20"
            />
            <span className="font-display text-lg font-bold tracking-tight max-sm:hidden">
              HS Digital
            </span>
          </Link>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query ?? ""}
              onChange={(e) => onQueryChange?.(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              placeholder="Buscar produtos e lojas..."
              aria-label="Buscar produtos e lojas"
              className="h-10 w-full rounded-full border border-white/15 bg-white pl-9 pr-4 text-sm text-foreground outline-none ring-primary-glow/60 placeholder:text-muted-foreground focus:ring-2"
            />
            {onQueryChange && searchFocused && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
                {matches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onQueryChange(item.title);
                      setSearchFocused(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-accent"
                  >
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-1">
            <Link
              to="/carrinho"
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
              aria-label="Carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-glow px-1 text-[11px] font-bold">
                  {count}
                </span>
              )}
            </Link>
            {signedIn ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground max-sm:hidden"
                aria-label="Sair da conta"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Link
                to="/auth"
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
                aria-label="Minha conta"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 sm:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </nav>
        </div>

        <div className="mt-2 hidden items-center gap-4 text-sm text-white/80 sm:flex">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-white">
              {item.label}
            </Link>
          ))}
          <span className="ml-auto flex items-center gap-2">
            <Store className="h-4 w-4" />
            <Link to="/vendedor" className="hover:text-white">
              Venda na HS Digital
            </Link>
          </span>
        </div>

        {open && (
          <div className="mt-3 grid gap-1 rounded-xl bg-white/10 p-2 text-sm sm:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="justify-start text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                Sair da conta
              </Button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Entrar / Criar conta
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function AuthCta() {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link to="/auth">
        <LogIn className="h-4 w-4" /> Entrar
      </Link>
    </Button>
  );
}
