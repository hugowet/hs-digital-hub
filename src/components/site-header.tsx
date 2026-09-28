import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Home, LogIn, LogOut, Menu, Search, ShoppingBag, ShoppingCart, Store, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCart } from "@/lib/cart";
import logoAsset from "@/assets/hs-digital-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const matches = useMemo(() => {
    const normalized = (query ?? "").trim().toLowerCase();
    if (!normalized) return suggestions.slice(0, 5);
    return suggestions
      .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(normalized))
      .slice(0, 5);
  }, [query, suggestions]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
        setIsAdmin(Boolean(role));
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setSignedIn(!!session?.user);
        if (!session?.user) setIsAdmin(false);
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
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onQueryChange(item.title);
                      setSearchFocused(false);
                      navigate({ to: "/produto/$productId", params: { productId: item.id } });
                    }}
                    className="h-auto w-full justify-between rounded-none px-4 py-3 text-left text-sm"
                  >
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.category}</span>
                  </Button>
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
              <>
                <Link to="/notificacoes" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden" aria-label="Notificações"><Bell className="h-5 w-5" /></Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground max-sm:hidden" aria-label="Menu da conta"><User className="h-5 w-5" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>Minha conta HS Digital</DropdownMenuLabel><DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/conta"><User />Minha conta</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/compras"><ShoppingBag />Minhas compras</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/notificacoes"><Bell />Notificações</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/vendedor"><Store />Seller Center</Link></DropdownMenuItem>
                    {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><User />Admin</Link></DropdownMenuItem>}
                    <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void signOut()}><LogOut />Sair da conta</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                to="/auth"
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
                aria-label="Minha conta"
              >
                <User className="h-5 w-5" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen((v) => !v)}
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </nav>
        </div>

        <div className="mt-2 hidden items-center gap-4 text-sm text-white/80 sm:flex">
          <Link to="/" className="hover:text-white">Início</Link><Link to="/compras" className="hover:text-white">Minhas compras</Link><Link to="/notificacoes" className="hover:text-white">Notificações</Link>
          <span className="ml-auto flex items-center gap-2">
            <Store className="h-4 w-4" />
            <Link to="/vendedor" className="hover:text-white">
              Venda na HS Digital
            </Link>
          </span>
        </div>

        {open && (
          <div className="mt-3 grid gap-1 rounded-lg border border-primary-foreground/10 bg-ink/70 p-2 text-sm shadow-xl backdrop-blur sm:hidden">
            <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><Home className="h-4 w-4" />Início</Link>
            {signedIn && <><Link to="/conta" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><User className="h-4 w-4" />Minha conta</Link><Link to="/compras" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><ShoppingBag className="h-4 w-4" />Minhas compras</Link><Link to="/notificacoes" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><Bell className="h-4 w-4" />Notificações</Link></>}
            <Link to="/carrinho" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><ShoppingCart className="h-4 w-4" />Carrinho {count > 0 ? `(${count})` : ""}</Link>
            <Link to="/vendedor" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><Store className="h-4 w-4" />Seller Center</Link>
            {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"><User className="h-4 w-4" />Admin</Link>}
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
