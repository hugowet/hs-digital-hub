import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Crown,
  Gamepad2,
  Home,
  Landmark,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Play,
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
import { catalogSearchGroups, normalizeCatalogSearch } from "@/lib/catalog-search";

declare module "@tanstack/react-router" {
  interface HistoryState { hsMobileMenu?: boolean }
}

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const menuScroll = useRef(0);
  const menuEntry = useRef(false);

  useEffect(() => router.history.subscribe(({ location, action }) => {
    if (location.state.hsMobileMenu) { menuEntry.current = true; return; }
    const wasMenu = menuEntry.current;
    menuEntry.current = false;
    setOpen(false);
    if (wasMenu && action.type === "BACK") {
      const scroll = menuScroll.current;
      window.requestAnimationFrame(() => window.scrollTo({ top: scroll, behavior: "instant" }));
    }
  }), [router]);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      if (router.history.location.state.hsMobileMenu) router.history.back({ ignoreBlocker: true });
      return;
    }
    menuScroll.current = window.scrollY;
    const location = router.history.location;
    router.history.push(location.href, { hsMobileMenu: true, hsExitGuard: location.state.hsExitGuard }, { ignoreBlocker: true });
    router.history.flush();
    setOpen(true);
    window.requestAnimationFrame(() => window.scrollTo({ top: menuScroll.current, behavior: "instant" }));
  };
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ["notification-count"], enabled: signedIn,
    queryFn: async () => {
      const { count, error } = await supabase.from("account_notifications").select("id", { head: true, count: "exact" }).is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    }, refetchInterval: 60000,
  });

  // Estado local para resposta rápida sem lag
  const [localQuery, setLocalQuery] = useState(query);
  const [searchFocused, setSearchFocused] = useState(false);

  // Referência do campo de busca, usada para fechar o teclado do celular
  const inputRef = useRef<HTMLInputElement>(null);

  // Only text the user typed is sent to the URL; a URL change (e.g. Back button) wins over the field.
  const typedRef = useRef(false);
  useEffect(() => {
    if (typedRef.current) return;
    setLocalQuery(query);
  }, [query]);

  const latest = useRef({ query, onQueryChange });
  latest.current = { query, onQueryChange };
  useEffect(() => {
    if (!typedRef.current) return;
    const timer = setTimeout(() => {
      const { query: current, onQueryChange: change } = latest.current;
      typedRef.current = false;
      if (localQuery !== current && change) change(localQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [localQuery]);

  const matches = useMemo(() => {
    const raw = normalizeCatalogSearch(localQuery ?? "");
    if (!raw || raw.length < 2) return [];
    const groups = catalogSearchGroups(raw);
    if (!groups.length) return [];
    return suggestions
      .filter((item) => {
        const text = normalizeCatalogSearch(`${item.title} ${item.category}`);
        return groups.every((g) => g.some((w) => text.includes(w)));
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
    } else {
      navigate({ to: "/", search: { q: localQuery || undefined } });
    }
  };

  return (
    <header className="sticky top-0 z-50 brand-gradient text-primary-foreground shadow-md">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src={logoAsset.url}
              alt="HS Digital"
              width={40}
              height={40}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full ring-1 ring-white/20 object-cover"
            />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight max-sm:hidden">
              HS Digital
            </span>
          </Link>

          {/* Barra de Pesquisa */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerSearch();
              }}
              action="/"
              method="get"
              className="w-full m-0 p-0"
            >
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                value={localQuery}
                onChange={(e) => { typedRef.current = true; setLocalQuery(e.target.value); }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Buscar produtos e lojas..."
                aria-label="Buscar produtos e lojas"
                className="h-10 w-full rounded-full border border-white/15 bg-white pl-9 pr-9 text-sm text-foreground outline-none ring-primary-glow/60 placeholder:text-muted-foreground focus:ring-2"
              />
            </form>
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery("");
                  if (onQueryChange) onQueryChange("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Menu de Sugestões Rápidas */}
            {searchFocused && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
                <div className="bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sugestões
                </div>
                {matches.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      inputRef.current?.blur();
                      setLocalQuery(item.title);
                      if (onQueryChange) onQueryChange(item.title);
                      setSearchFocused(false);
                      navigate({ to: "/produto/$productId", params: { productId: item.id } });
                    }}
                    className="h-auto w-full justify-between rounded-none px-4 py-3 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground ml-2 capitalize">
                      {item.category}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-1 sm:gap-1.5">
            {/* Carrinho */}
            {signedIn && (
              <Link
                to="/carrinho"
                className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
                aria-label="Carrinho"
                title="Meu Carrinho"
              >
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-glow px-1 text-[11px] font-bold">
                    {count}
                  </span>
                )}
              </Link>
            )}

            {/* Programa de Afiliados */}
            <Link
              to="/afiliados"
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 text-primary-foreground"
              aria-label="Programa de Afiliados"
              title="Programa de Afiliados (Ganhe 10%)"
            >
              <Share2 className="h-5 w-5" />
            </Link>

            {signedIn ? (
              <>
                <Link
                  to="/notificacoes"
                  className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
                  aria-label="Notificações"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount + unreadMessages > 0 && (
                    <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold">
                      {notificationCount + unreadMessages}
                    </span>
                  )}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground max-sm:hidden"
                      aria-label="Menu da conta"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>Minha conta HS Digital</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate({ to: "/conta" })}>
                      <User className="mr-2 h-4 w-4" />
                      Minha conta
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/social" })}>
                      <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" />
                      HS Social
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/conta" })}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Meus endereços
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/compras" })}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Minhas compras
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
                    <DropdownMenuItem onSelect={() => navigate({ to: "/hs-bank" })}>
                      <Landmark className="mr-2 h-4 w-4" />
                      HS Bank
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
              onClick={toggleMenu}
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:hidden"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="mobile-account-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
              to="/afiliados"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Afiliados (10%)
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
          <div id="mobile-account-menu" className="absolute left-3 right-3 top-full mt-1 grid max-h-[calc(100dvh-5rem)] gap-1 overflow-y-auto overscroll-contain rounded-lg border border-primary-foreground/10 bg-ink p-2 text-sm text-ink-foreground shadow-xl sm:hidden">
            <Link
              to="/"
              replace
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
            >
              <Home className="h-4 w-4" />
              Início
            </Link>

            {signedIn && (
              <>
                <Link
                  to="/conta"
                  replace
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <User className="h-4 w-4" />
                  Minha conta e endereços
                </Link>
                <Link
                  to="/compras"
                  replace
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Minhas compras
                </Link>
                {isBuyer && (
                  <Link
                    to="/cupons"
                    replace
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                  >
                    <TicketPercent className="h-4 w-4" />
                    Meus cupons
                  </Link>
                )}
                <Link
                  to="/notificacoes"
                  replace
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <Bell className="h-4 w-4" />
                  Notificações {notificationCount + unreadMessages > 0 ? `(${notificationCount + unreadMessages})` : ""}
                </Link>
              </>
            )}

            <Link
              to="/afiliados"
              replace
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-emerald-400 hover:bg-primary-foreground/10 font-medium"
            >
              <Share2 className="h-4 w-4" />
              Programa de Afiliados (10%)
            </Link>

            {isBuyer && (
              <Link
                to="/jogos"
                replace
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
              >
                <Gamepad2 className="h-4 w-4" />
                Jogos & Prêmios
              </Link>
            )}

               <Link
              to="/vendedor"
              replace
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
            >
              <Store className="h-4 w-4" />
              Venda na HS Digital
            </Link>

            {/* ADICIONE ESTE BLOCO AQUI */}
            {isAdmin && (
              <Link
                to="/admin"
                replace
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-primary hover:bg-primary-foreground/10 font-medium"
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
                replace
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
