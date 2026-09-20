import { Link } from "@tanstack/react-router";
import { Bell, LogIn, Menu, Search, ShoppingCart, Store, User } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/carrinho", label: "Carrinho" },
  { to: "/vendedor", label: "Seller Center" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteHeader({
  query,
  onQueryChange,
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 brand-gradient text-primary-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg primary-gradient font-display text-base font-bold">
              HS
            </span>
            <span className="font-display text-lg font-bold tracking-tight max-sm:hidden">
              HS Digital
            </span>
          </Link>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query ?? ""}
              onChange={(e) => onQueryChange?.(e.target.value)}
              placeholder="Buscar produtos, marcas e lojas..."
              className="h-10 w-full rounded-full border border-white/15 bg-white pl-9 pr-4 text-sm text-foreground outline-none ring-primary-glow/60 placeholder:text-muted-foreground focus:ring-2"
            />
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
            <button
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-glow" />
            </button>
            <Link
              to="/auth"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
              aria-label="Minha conta"
            >
              <User className="h-5 w-5" />
            </Link>
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
            <Link to="/auth" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
              Entrar / Criar conta
            </Link>
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
