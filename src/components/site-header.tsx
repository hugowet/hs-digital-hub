import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
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
  Crown,
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
    setLocalQuery(query);
  }, [query]);
  // Debounce leve para atualizar o filtro sem congelar a tela
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
    // Fecha o teclado virtual do celular ao pesquisar
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
                onChange={(e) => setLocalQuery(e.target.value)}
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
                      // Fecha o teclado virtual ao escolher uma sugestão
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
          <nav className="flex items-center gap-1">
            {signedIn && (
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
            )}
            {signedIn ? (
              <>
                <Link
                  to="/notificacoes"
                  className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 max-sm:hidden"
                  aria-label="Notificações"
                >
                  <Bell className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold">
                      {unreadMessages}
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
                    <DropdownMenuItem onSelect={() => navigate({ to: "/conta" })}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Meus endereços
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/compras" })}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Minhas compras
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
        {signedIn && <div className="mt-2 hidden items-center gap-4 text-sm text-white/80 sm:flex">
          <Link to="/" className="hover:text-white">
            Início
          </Link>
          <Link
  to="/clube-hs"
  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 transition-colors"
>
  <Crown className="w-3.5 h-3.5" />
  Clube HS
</Link>
             {/* 🎵 LINK DA RÁDIO AUTOMÁTICO ABAIXO DO CLUBE HS */}
            <Link
              to="/radio"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-white hover:bg-primary-foreground/10"
            >
              <span>🎵</span> Rádio HS Digital
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
        </div>}
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
            {signedIn && (
              <>
                <Link
                  to="/carrinho"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Carrinho {count > 0 ? `(${count})` : ""}
                </Link>
                <Link
                  to="/vendedor"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
                >
                  <Store className="h-4 w-4" />
                  Seller Center
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-primary-foreground/10"
              >
                <User className="h-4 w-4" />
                Admin
              </Link>
            )}
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
