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

  const [localQuery, setLocalQuery] = useState(query);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logotipo Oficial Restaurado */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={logoAsset.url}
              alt="HS Digital"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-xl mx-1 sm:mx-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerSearch();
              }}
              className="flex items-center"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar produtos, marcas e muito mais..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="w-full h-9 sm:h-10 pl-3 pr-9 sm:pr-10 rounded-full bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute right-1 sm:right-1.5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Sugestões de Busca */}
            {searchFocused && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                {matches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLocalQuery(item.title);
                      setSearchFocused(false);
                      navigate({ to: `/produto/${item.id}` });
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-none"
                  >
                    <span className="font-medium text-slate-700">{item.title}</span>
                    <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navegação Direita */}
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 🌟 CLUBE HS NO TOPO */}
            <div className="hidden md:flex items-center gap-2 mr-1">
              <Link
                to="/clube-hs"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 transition-colors"
              >
                <span>🌟</span> Clube HS
              </Link>
            </div>

            {/* Carrinho */}
            <Link
              to="/carrinho"
              className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Carrinho de Compras"
            >
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {/* Mensagens */}
            {signedIn && isBuyer && (
              <Link
                to="/pedidos"
                className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Mensagens de Pedidos"
              >
                <Bell className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            )}

            {/* Conta Desktop */}
            <div className="hidden sm:flex items-center">
              {signedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-white/10 transition-colors">
                      <User className="w-4 h-4 mr-1" />
                      Minha Conta
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/conta" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" /> Meus Dados
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/pedidos" className="cursor-pointer">
                        <ShoppingBag className="w-4 h-4 mr-2" /> Meus Pedidos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/cupons" className="cursor-pointer">
                        <TicketPercent className="w-4 h-4 mr-2" /> Meus Cupons
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer text-amber-500 font-bold">
                          Painel Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <LogIn className="w-4 h-4" /> Entrar
                </Link>
              )}
            </div>

            {/* Menu Hambúrguer Mobile */}
            <button
              onClick={() => setOpen(!open)}
              className="sm:hidden p-2 text-white hover:bg-white/10 rounded-full"
              aria-label="Abrir Menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
        </div>

        {/* Barra de Sub-Navegação Desktop */}
        <div className="hidden sm:flex items-center gap-6 mt-2 pt-2 border-t border-white/10 text-xs font-medium text-white/90">
          <div className="flex items-center gap-1 text-white/80">
            <MapPin className="w-3.5 h-3.5" />
            <span>Enviar para São Paulo 01000-000</span>
          </div>

          <Link to="/" className="hover:text-white">
            Categorias
          </Link>
          <Link to="/cupons" className="hover:text-white">
            Ofertas do Dia
          </Link>
          <Link to="/pedidos" className="hover:text-white">
            Histórico
          </Link>
          <Link to="/clube-hs" className="hover:text-white text-amber-300 font-bold">
            Clube HS
          </Link>

          {isAdmin && (
            <Link to="/admin" className="hover:text-white text-amber-300 font-bold">
              Painel Admin
            </Link>
          )}
          <Link to="/vendedor" className="hover:text-white ml-auto">
            Vender na HS Digital
          </Link>
        </div>
      </div>

      {/* Menu Sanduíche Mobile */}
      {open && (
        <div className="md:hidden bg-slate-900 text-white px-4 py-4 space-y-3 border-t border-slate-800 shadow-xl">
          <div className="pb-3 border-b border-slate-800">
            <Link
              to="/clube-hs"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-400/20 text-amber-300 font-bold text-xs"
            >
              <span>🌟</span> Clube HS
            </Link>
          </div>

          <div className="space-y-1 text-sm font-medium">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10"
            >
              <Home className="w-4 h-4" /> Início
            </Link>
            {signedIn ? (
              <>
                <Link
                  to="/conta"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10"
                >
                  <User className="w-4 h-4" /> Minha Conta
                </Link>
                <Link
                  to="/pedidos"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10"
                >
                  <ShoppingBag className="w-4 h-4" /> Meus Pedidos
                </Link>
                <Link
                  to="/cupons"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10"
                >
                  <TicketPercent className="w-4 h-4" /> Meus Cupons
                </Link>
                <Link
                  to="/jogos"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10"
                >
                  <Gamepad2 className="w-4 h-4" /> Jogos &amp; Prêmios
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10 text-amber-300 font-bold"
                  >
                    Painel Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg text-rose-400 hover:bg-white/10 w-full text-left"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2 px-2 rounded-lg bg-primary text-white font-semibold justify-center"
              >
                <LogIn className="w-4 h-4" /> Fazer Login / Cadastrar
              </Link>
            )}

            <div className="pt-2 border-t border-slate-800">
              <Link
                to="/vendedor"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/10 text-amber-300"
              >
                <Store className="w-4 h-4" /> Vender na HS Digital
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
