import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Gamepad2,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  TicketPercent,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/lib/cart";
import logoAsset from "@/assets/hs-digital-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader({
  query = "",
  onQueryChange,
  suggestions = [],
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
  suggestions?: Array<{ id: string; title: string; category: string }>;
}) {
  const { count, clear } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [localQuery, setLocalQuery] = useState(query);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query && onQueryChange) {
        onQueryChange(localQuery);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localQuery, onQueryChange, query]);

  const matches = useMemo(() => {
    const normalized = (localQuery ?? "").trim().toLowerCase();
    if (!normalized || normalized.length < 2) return [];
    return suggestions
      .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [localQuery, suggestions]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        setIsAdmin(Boolean(roles?.some((item) => item.role === "admin")));
        const { count: unread } = await supabase
          .from("order_messages")
          .select("id,order_conversations!inner(buyer_id)", { count: "exact", head: true })
          .is("read_at", null)
          .neq("sender_id", data.user.id)
          .eq("order_conversations.buyer_id", data.user.id);
        setUnreadMessages(unread ?? 0);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setSignedIn(!!session?.user);
        if (!session?.user) {
          setIsAdmin(false);
          setUnreadMessages(0);
          clear();
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const triggerSearch = () => {
    setSearchFocused(false);
    if (onQueryChange) {
      onQueryChange(localQuery);
    } else {
      navigate({ to: "/", search: { q: localQuery || undefined } });
    }
  };

  return (
    <header className="sticky top-0 z-50 brand-gradient text-primary-foreground shadow-md">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logotipo Otimizado e com Nitidez Máxima */}
          <Link to="/" className="flex shrink-0 items-center gap-2 transition hover:opacity-95">
            <img
              src={logoAsset.url}
              alt="HS Digital"
              loading="eager"
              decoding="async"
              className="h-8 sm:h-10 w-auto max-w-[130px] sm:max-w-[180px] object-contain select-none [image-rendering:-webkit-optimize-contrast] [image-rendering:crisp-edges]"
            />
          </Link>

          <div className="relative flex-1 max-w-2xl mx-1 sm:mx-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerSearch();
              }}
              className="relative w-full"
            >
              <input
                type="search"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Buscar produtos, marcas e mais..."
                className="w-full rounded-full bg-white/95 text-foreground placeholder:text-muted-foreground px-3.5 sm:px-4 py-1.5 sm:py-2 pl-9 sm:pl-10 pr-9 sm:pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent shadow-inner transition"
              />
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground pointer-events-none" />
              {localQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocalQuery("");
                    onQueryChange?.("");
                  }}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </form>

            {searchFocused && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-card text-card-foreground shadow-2xl border border-border overflow-hidden z-50 animate-in fade-in-50 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 border-b border-border">
                  Sugestões de busca
                </div>
                <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                  {matches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLocalQuery(item.title);
                        onQueryChange?.(item.title);
                        setSearchFocused(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-muted/60 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs sm:text-sm truncate text-foreground">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded shrink-0">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <nav className="hidden lg:flex items-center gap-1.5 shrink-0 text-sm">
            <Link
              to="/"
              className="px-2.5 py-1.5 rounded-md hover:bg-white/10 transition font-medium flex items-center gap-1.5"
            >
              <Home className="h-4 w-4" /> Início
            </Link>

            <Link
              to="/jogos"
              className="px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300 font-black transition flex items-center gap-1.5 shadow-md animate-pulse"
            >
              <Gamepad2 className="h-4 w-4 fill-slate-950" />
              <span>Jogos & Prêmios</span>
            </Link>

            <Link
              to="/cupons"
              className="px-2.5 py-1.5 rounded-md hover:bg-white/10 transition font-medium flex items-center gap-1.5"
            >
              <TicketPercent className="h-4 w-4" /> Cupons
            </Link>

            {signedIn && (
              <Link
                to="/pedidos"
                className="px-2.5 py-1.5 rounded-md hover:bg-white/10 transition font-medium flex items-center gap-1.5 relative"
              >
                <ShoppingBag className="h-4 w-4" /> Minhas Compras
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            )}

            <Link
              to="/vendedor"
              className="px-2.5 py-1.5 rounded-md hover:bg-white/10 transition font-medium flex items-center gap-1.5"
            >
              <Store className="h-4 w-4" /> Painel Lojista
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="px-2.5 py-1.5 rounded-md bg-white/20 hover:bg-white/30 transition font-semibold"
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              to="/carrinho"
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition flex items-center justify-center"
              aria-label="Carrinho"
            >
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-accent text-[10px] sm:text-xs font-bold text-accent-foreground shadow">
                  {count}
                </span>
              )}
            </Link>

            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-white/10 text-primary-foreground h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/pedidos" className="flex items-center gap-2 cursor-pointer">
                      <ShoppingBag className="h-4 w-4" /> Minhas Compras
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/cupons" className="flex items-center gap-2 cursor-pointer">
                      <TicketPercent className="h-4 w-4" /> Meus Cupons
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/jogos" className="flex items-center gap-2 cursor-pointer font-bold text-amber-600">
                      <Gamepad2 className="h-4 w-4" /> Jogos & Prêmios
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/enderecos" className="flex items-center gap-2 cursor-pointer">
                      <MapPin className="h-4 w-4" /> Meus Endereços
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold px-2.5 sm:px-3 text-xs sm:text-sm h-7 sm:h-8"
              >
                <Link to="/auth" className="flex items-center gap-1 sm:gap-1.5">
                  <LogIn className="h-3.5 w-3.5" /> Entrar
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-primary-foreground hover:bg-white/10 h-8 w-8"
              onClick={() => setOpen(!open)}
              aria-label="Abrir menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/20 flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-white/10 font-medium flex items-center gap-2"
            >
              <Home className="h-4 w-4" /> Início
            </Link>
            <Link
              to="/jogos"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center gap-2 shadow"
            >
              <Gamepad2 className="h-4 w-4 fill-slate-950" /> Jogos & Prêmios
            </Link>
            <Link
              to="/cupons"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-white/10 font-medium flex items-center gap-2"
            >
              <TicketPercent className="h-4 w-4" /> Cupons de Desconto
            </Link>
            {signedIn && (
              <Link
                to="/pedidos"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-white/10 font-medium flex items-center gap-2 justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Minhas Compras
                </span>
                {unreadMessages > 0 && (
                  <span className="rounded-full bg-accent text-[10px] font-bold text-accent-foreground px-2 py-0.5">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/vendedor"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-white/10 font-medium flex items-center gap-2"
            >
              <Store className="h-4 w-4" /> Painel Lojista
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md bg-white/20 font-semibold"
              >
                Painel Administrador
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
