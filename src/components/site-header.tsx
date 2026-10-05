import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Heart,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
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
  suggestions?: Array<{ id: string; title: string; category: string; price?: number; image?: string }>;
}) {
  const { count } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Estado local para digitação imediata e sem travamentos
  const [localQuery, setLocalQuery] = useState(query);
  const [isFocused, setIsFocused] = useState(false);

  // Sincroniza se a URL mudar externamente
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounce: só avisa a página principal 250ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query) {
        onQueryChange?.(localQuery);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localQuery, onQueryChange, query]);

  // Sugestões instantâneas calculadas na memória
  const filteredSuggestions = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return suggestions
      .filter((s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .slice(0, 6);
  }, [localQuery, suggestions]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(Boolean(role));
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

  const handleSelectSuggestion = (id: string) => {
    setIsFocused(false);
    navigate({ to: "/produto/$productId", params: { productId: id } });
  };

  return (
    <header className="sticky top-0 z-50 brand-gradient text-primary-foreground shadow-md">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src={logoAsset.url}
              alt="HS Digital"
              width={38}
              height={38}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full ring-1 ring-white/20 object-cover"
            />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight max-sm:hidden">HS Digital</span>
          </Link>

          {/* Campo de Busca Rápido */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onQueryChange?.(localQuery);
                  setIsFocused(false);
                }
              }}
              placeholder="Buscar produtos e marcas..."
              aria-label="Buscar produtos e marcas"
              className="h-10 w-full rounded-full border border-white/20 bg-white pl-9 pr-8 text-sm text-foreground outline-none shadow-inner placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-400"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery("");
                  onQueryChange?.("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Menu de Sugestões Instantâneas ao Digitar */}
            {isFocused && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
                <div className="p-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b">
                  Sugestões encontradas
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {filteredSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(item.id)}
                      className="flex w-full items-center gap-3 p-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
                    >
                      <Search className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="flex-1 truncate">
                        <p className="truncate font-medium text-gray-800">{item.title}</p>
                        <span className="text-[11px] text-gray-400 capitalize">{item.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Carrinho e Menu */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button asChild variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
              <Link to="/carrinho" aria-label="Carrinho">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-gray-900">
                    {count}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" /> Início
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/compras" className="cursor-pointer">
                    <ShoppingBag className="mr-2 h-4 w-4" /> Minhas Compras
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/vendedor" className="cursor-pointer">
                    <Store className="mr-2 h-4 w-4" /> Área do Vendedor
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer font-semibold text-primary">
                      <Store className="mr-2 h-4 w-4" /> Painel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {signedIn ? (
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/auth" className="cursor-pointer font-medium text-primary">
                      <LogIn className="mr-2 h-4 w-4" /> Entrar / Cadastrar
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
