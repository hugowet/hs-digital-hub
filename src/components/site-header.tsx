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
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
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
          {/* Logotipo */}
          <Link to="/" className="flex shrink-0 items-center gap-2 transition hover:opacity-95">
            <img
              src={logoAsset.url}
              alt="HS Digital"
              loading="eager"
              decoding="async"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover select-none shadow-sm [image-rendering:-webkit-optimize-contrast] [image-rendering:crisp-edges]"
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
                placeholder="Buscar produtos, marcas, lojas..."
                className="w-full rounded-full bg-white/95 text-foreground placeholder:text-muted-foreground/70 pl-4 pr-10 py-1.5 sm:py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
            {searchFocused && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
                <div className="p-1">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Sugestões
                  </div>
                  {matches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => {
                        navigate({ to: "/produto/$productId", params: { productId: item.id } });
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent/15 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium truncate mr-2">{item.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0 capitalize">{item.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hidden lg:flex items-center gap-1 text-xs text-primary-foreground/90 shrink-0">
            <Link
              to="/jogos"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-amber-300"
            >
              <Gamepad2 className="h-4 w-4" />
              <span>Jogar & Ganhar</span>
            </Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              to="/carrinho"
              className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow">
                  {count}
                </span>
              )}
            </Link>
            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative text-primary-foreground hover:bg-white/10 rounded-full h-9 w-9 p-0"
                  >
                    <User className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
                        {unreadMessages}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/compras" className="cursor-pointer">
                      <ShoppingBag className="mr-2 h-4 w-4" /> Minhas Compras
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendedor" className="cursor-pointer">
                      <Store className="mr-2 h-4 w-4" /> Painel do Vendedor
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer font-medium text-primary">
                        Painel de Controle
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-xs font-semibold px-3 sm:px-4 shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1.5" />
                  Entrar
                </Button>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-primary-foreground"
              aria-label="Abrir menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <nav className="hidden lg:flex items-center gap-6 mt-2 pt-1 border-t border-white/10 text-xs font-medium text-primary-foreground/90">
          <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
            <Home className="h-3.5 w-3.5" /> Início
          </Link>
          <Link
            to="/"
            search={{ freeShipping: true }}
            className="hover:text-white transition-colors flex items-center gap-1 text-emerald-300"
          >
            <TicketPercent className="h-3.5 w-3.5" /> Frete Grátis
          </Link>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-white/80">
              <MapPin className="h-3 w-3" /> Entregamos em todo o Brasil
            </span>
          </div>
        </nav>
      </div>
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-brand-navy p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <Home className="h-4 w-4" /> Início
            </Link>
            <Link
              to="/jogos"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-amber-300"
            >
              <Gamepad2 className="h-4 w-4" /> Jogos & Prêmios
            </Link>
            <Link
              to="/carrinho"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" /> Carrinho ({count})
            </Link>
            <Link
              to="/vendedor"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <Store className="h-4 w-4" /> Vendedor
            </Link>
          </div>
          <Link
            to="/"
            search={{ freeShipping: true }}
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-sm text-emerald-300"
          >
            <TicketPercent className="h-4 w-4" /> Frete Grátis
          </Link>
          <div className="border-t border-white/10 pt-3">
            {signedIn ? (
              <div className="space-y-1">
                <Link to="/compras" onClick={() => setOpen(false)} className="block py-1.5 text-sm hover:text-accent">
                  Minhas Compras
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="block py-1.5 text-sm text-primary font-medium"
                  >
                    Painel de Controle
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="w-full text-left py-1.5 text-sm text-destructive flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Sair da conta
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="w-full inline-flex justify-center items-center gap-2 py-2 rounded-lg bg-accent text-accent-foreground font-semibold text-sm"
              >
                <LogIn className="h-4 w-4" /> Entrar ou Criar Conta
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
