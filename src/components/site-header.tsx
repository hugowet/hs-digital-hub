import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Crown,
  Gamepad2,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Radio,
  Search,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Store,
  TicketPercent,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [isBuyer, setIsBuyer] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Estado local para resposta rápida sem lag
  const [localQuery, setLocalQuery] = useState(query);
  const [searchFocused, setSearchFocused] = useState(false);

  // Referência do campo de busca, usada para fechar o teclado do celular
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchFocused) {
      setLocalQuery(query);
    }
  }, [query, searchFocused]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query && onQueryChange) {
        onQueryChange(localQuery);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localQuery, onQueryChange, query]);

  const matches = useMemo(() => {
    const raw = (localQuery ?? "").trim().toLowerCase();
    if (!raw || raw.length < 2) return [];
    const words = raw.split(/\s+/).filter(Boolean);
    return suggestions
      .filter((item) => {
        const text = `${item.title} ${item.category}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
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
        setIsBuyer(
          Boolean(
            roles?.some((item) => item.role === "buyer") &&
              !roles?.some((item) => item.role === "seller"),
          ),
        );

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
          setIsBuyer(false);
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
    inputRef.current?.blur();
    if (onQueryChange) {
      onQueryChange(localQuery);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-primary/20 bg-primary px-4 py-2.5 text-primary-foreground shadow-md">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight shrink-0">
            {logoAsset?.url ? (
              <img
                src={logoAsset.url}
                alt="HS Digital"
                className="h-9 w-auto max-w-[120px] object-contain sm:h-10 sm:max-w-[150px]"
              />
            ) : (
              <span className="text-lg font-black tracking-tighter text-white">HS DIGITAL</span>
            )}
          </Link>

          {/* Barra de Pesquisa */}
          <div className="relative flex-1 max-w-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerSearch();
              }}
              className="relative flex items-center"
            >
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="search"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                placeholder="Buscar produtos, marcas e muito mais..."
                className="h-10 w-full rounded-full border-0 bg-white pl-9 pr-10 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {localQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocalQuery("");
                    if (onQueryChange) onQueryChange("");
                  }}
                  className="absolute right-3 grid h-5 w-5 place-items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </form>

            {/* Sugestões de Busca */}
            {searchFocused && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sugestões
                </div>
                {matches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => {
                      setLocalQuery(item.title);
                      if (onQueryChange) onQueryChange(item.title);
                      setSearchFocused(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="font-medium line-clamp-1">{item.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navegação e Ações */}
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Carrinho */}
            <Link
              to="/carrinho"
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
              aria-label="Carrinho"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground shadow-sm">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>

            {signedIn ? (
              <>
                {/* Menu de Usuário (Desktop) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
                      aria-label="Minha conta"
                    >
                      <User className="h-5 w-5" />
                      {unreadMessages > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-primary" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate({ to: "/conta" })}>
                      <User className="mr-2 h-4 w-4" />
                      Meus dados e endereços
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/compras" })}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Minhas compras
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/social" })}>
                      <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" />
                      HS Social
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/clube-hs" })}>
                      <Crown className="mr-2 h-4 w-4 text-amber-500" />
                      Clube HS
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/afiliados" })}>
                      <Share2 className="mr-2 h-4 w-4 text-emerald-500" />
                      Programa de Afiliados (10%)
                    </DropdownMenuItem>
                    {isBuyer && (
                      <DropdownMenuItem onSelect={() => navigate({ to: "/cupons" })}>
                        <TicketPercent className="mr-2 h-4 w-4" />
                        Meus cupons
                      </DropdownMenuItem>
                    )}
                    {isBuyer && (
                      <DropdownMenuItem onSelect={() => navigate({ to: "/jogos" })}>
                        <Gamepad2 className="mr-2 h-4 w-4" />
                        Jogos & Prêmios
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => navigate({ to: "/notificacoes" })}>
                      <Bell className="mr-2 h-4 w-4" />
                      Notificações
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/vendedor" })}>
                      <Store className="mr-2 h-4 w-4" />
                      Seller Center
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
                        <User className="mr-2 h-4 w-4" />
                        Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => void signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair da conta
                    </DropdownMenuItem>
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

        {/* Linha de Submenu (Desktop) */}
        {signedIn && (
          <div className="mt-2 hidden items-center gap-3.5 text-sm text-white/80 sm:flex">
            <Link to="/" className="hover:text-white">
              Início
            </Link>
            <Link
              to="/clube-hs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 transition-colors"
            >
              <Crown className="w-3.5 h-3.5" />
              Clube HS
            </Link>
            <Link
              to="/afiliados"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Afiliados (10%)
            </Link>

            <Link
              to="/social"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30 border border-emerald-400/30 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
              HS Social
            </Link>

            <Link to="/compras" className="hover:text-white">
              Minhas compras
            </Link>
            {isBuyer && (
              <Link to="/jogos" className="hover:text-white">
                Jogos & Prêmios
              </Link>
            )}
            {isBuyer && (
              <Link to="/cupons" className="hover:text-white">
                Meus cupons
              </Link>
            )}
            <Link to="/notificacoes" className="hover:text-white">
              Notificações
            </Link>
            <span className="ml-auto flex items-center gap-2">
              <Store className="h-4 w-4" />
              <Link to="/vendedor" className="hover:text-white">
                Venda na HS Digital
              </Link>
            </span>
          </div>
        )}

        {/* Menu Gaveta Mobile */}
        {open && (
          <div className="mt-3 grid gap-1 rounded-lg border border-primary-foreground/10 bg-black/80 p-2 text-sm shadow-xl backdrop-blur sm:hidden">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
            >
              <Home className="h-4 w-4" />
              Início
            </Link>

            <Link
              to="/social"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              HS Social (Mensagens & Grupos)
            </Link>

            {signedIn && (
              <>
                <Link
                  to="/conta"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <User className="h-4 w-4" />
                  Minha conta e endereços
                </Link>
                <Link
                  to="/compras"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Minhas compras
                </Link>
                {isBuyer && (
                  <Link
                    to="/cupons"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                  >
                    <TicketPercent className="h-4 w-4" />
                    Meus cupons
                  </Link>
                )}
                <Link
                  to="/notificacoes"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <Bell className="h-4 w-4" />
                  Notificações {unreadMessages > 0 ? `(${unreadMessages})` : ""}
                </Link>
              </>
            )}

            <Link
              to="/afiliados"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-emerald-400 hover:bg-primary-foreground/10 font-medium"
            >
              <Share2 className="h-4 w-4" />
              Programa de Afiliados (10%)
            </Link>

            <Link
              to="/clube-hs"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-amber-300 hover:bg-primary-foreground/10 font-medium"
            >
              <Crown className="h-4 w-4" />
              Clube HS
            </Link>

            {isBuyer && (
              <Link
                to="/jogos"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
              >
                <Gamepad2 className="h-4 w-4" />
                Jogos & Prêmios
              </Link>
            )}

            <Link
              to="/vendedor"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
            >
              <Store className="h-4 w-4" />
              Venda na HS Digital
            </Link>

            {/* Link Admin para dispositivos móveis */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-primary hover:bg-primary-foreground/10 font-semibold"
              >
                <User className="h-4 w-4" />
                Painel Admin
              </Link>
            )}

            {signedIn ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-destructive hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
              >
                <LogIn className="h-4 w-4" />
                Entrar / Cadastrar
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
