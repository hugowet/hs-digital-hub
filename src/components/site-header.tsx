import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  LogOut,
  MapPin,
  Package,
  Search,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { useAuthSession } from "@/lib/auth";

interface SiteHeaderProps {
  query?: string;
  onQueryChange?: (value: string) => void;
}

export function SiteHeader({ query = "", onQueryChange }: SiteHeaderProps) {
  const navigate = useNavigate();
  const { count } = useCart();
  const { session, signOut } = useAuthSession();
  const [activeTab, setActiveTab] = useState<"comprador" | "vendedor">("comprador");
  const signedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm">
      {/* PAINEL DE PROMOÇÕES (COMPRADOR VS VENDEDOR) */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white text-xs py-1.5 px-3 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          {/* Alternador de Modo */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("comprador")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                activeTab === "comprador"
                  ? "bg-[#00a650] text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Comprador
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vendedor")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                activeTab === "vendedor"
                  ? "bg-[#3483fa] text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Vendedor
            </button>
          </div>

          {/* Mensagem Dinâmica */}
          <div className="truncate text-center flex-1 hidden sm:block">
            {activeTab === "comprador" ? (
              <span className="text-gray-200">
                🎁 <strong>Frete Grátis na 1ª compra</strong> • Até 10x sem juros • Envio em 24h com compra 100% protegida!
              </span>
            ) : (
              <span className="text-gray-200">
                🚀 <strong>Venda na HS Digital:</strong> Taxa zero no 1º mês e receba direto via Pix. Alcance milhares de clientes!
              </span>
            )}
          </div>

          {/* Ação Direta */}
          <div className="shrink-0">
            {activeTab === "comprador" ? (
              <Link
                to="/carrinho"
                className="inline-flex items-center gap-1 text-[11px] text-green-300 hover:underline font-bold"
              >
                Pegar cupom <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                to="/vendedor"
                className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline font-bold"
              >
                Cadastrar loja <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* BARRA PRINCIPAL */}
      <div className="bg-[#3483fa] text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-black text-xl sm:text-2xl tracking-tight text-white shrink-0">
            <span>HS Digital</span>
          </Link>

          {/* Barra de Pesquisa */}
          <div className="relative flex-1 max-w-2xl mx-2">
            <div className="relative">
              <Input
                type="search"
                value={query}
                onChange={(e) => onQueryChange?.(e.target.value)}
                placeholder="Buscar produtos, marcas, modelos e ofertas..."
                className="h-10 w-full rounded-md bg-white pr-10 text-xs text-gray-900 placeholder:text-gray-400 shadow-inner border-0"
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-gray-800"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {signedIn && (
              <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10" title="Notificações">
                <Link to="/notificacoes">
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>
            )}

            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Minha conta">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-xs">
                  <DropdownMenuLabel>Minha conta HS Digital</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/conta" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Meu Perfil & CPF
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/compras" className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> Minhas Compras
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/conta" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Meus Endereços
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendedor" className="flex items-center gap-2">
                      <Store className="h-4 w-4" /> Painel do Vendedor
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()} className="text-red-600 flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" className="text-white text-xs hover:bg-white/10 max-sm:hidden">
                <Link to="/auth">Entrar / Criar conta</Link>
              </Button>
            )}

            {/* Carrinho */}
            <Button asChild variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
              <Link to="/carrinho" aria-label="Carrinho de compras">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
