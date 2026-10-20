import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShoppingBag,
  ExternalLink,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  Sparkles,
  Truck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ALLOWED_EMAILS = ["hugoet373@gmail.com", "hugohug12ou@gmail.com"];
const AMAZON_AFFILIATE_TAG = "hsdigitalst0c-20";
const PROFIT_MARGIN_MULTIPLIER = 1.35; // 35% de margem estável de lucro bruto

export function AmazonAffiliateImporter() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Verificação de Autenticação e Trava de Segurança
  useEffect(() => {
    async function loadUserAndStore() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase() || null;
        setCurrentUserEmail(email);

        if (email && ALLOWED_EMAILS.includes(email) && user) {
          // Busca a loja do administrador ou a loja principal
          const { data: store } = await supabase
            .from("stores")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();

          if (store) {
            setStoreId(store.id);
          } else {
            // Se ainda não tiver loja associada ao id, pega a loja mestre do marketplace
            const { data: defaultStore } = await supabase
              .from("stores")
              .select("id")
              .limit(1)
              .maybeSingle();
            setStoreId(defaultStore?.id || null);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar credenciais:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUserAndStore();
  }, []);

  // Cálculos de Margem em tempo real
  const rawCost = parseFloat(costPrice.replace(",", ".")) || 0;
  const calculatedSalePrice = rawCost > 0 ? Number((rawCost * PROFIT_MARGIN_MULTIPLIER).toFixed(2)) : 0;
  const grossProfit = rawCost > 0 ? Number((calculatedSalePrice - rawCost).toFixed(2)) : 0;

  // Formatação do link com a tag de afiliado
  const formatAmazonAffiliateLink = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return "";
    try {
      const parsed = new URL(cleanUrl);
      parsed.searchParams.set("tag", AMAZON_AFFILIATE_TAG);
      return parsed.toString();
    } catch {
      // Caso seja um link encurtado (amzn.to) ou sem protocolo
      if (cleanUrl.includes("tag=")) {
        return cleanUrl.replace(/tag=[^&]+/, `tag=${AMAZON_AFFILIATE_TAG}`);
      }
      return cleanUrl.includes("?")
        ? `${cleanUrl}&tag=${AMAZON_AFFILIATE_TAG}`
        : `${cleanUrl}?tag=${AMAZON_AFFILIATE_TAG}`;
    }
  };

  // Ação de Publicar na Vitrine
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return toast.error("Informe o título do produto.");
    if (!amazonUrl.trim()) return toast.error("Informe o link da Amazon.");
    if (rawCost <= 0) return toast.error("Informe um preço de custo válido.");
    if (!imageUrl.trim()) return toast.error("Informe a URL da imagem.");
    if (!storeId) return toast.error("Nenhuma loja ativa vinculada para receber o produto.");

    setSubmitting(true);
    const finalAffiliateUrl = formatAmazonAffiliateLink(amazonUrl);

    try {
      const { error } = await supabase.from("products").insert({
        store_id: storeId,
        title: title.trim(),
        description: `Produto oficial importado com garantia e entrega rápida via Amazon.`,
        price: calculatedSalePrice,
        compare_at_price: Number((calculatedSalePrice * 1.25).toFixed(2)), // Preço riscado de oferta
        supplier_cost: rawCost,
        image_url: imageUrl.trim(),
        free_shipping: true, // Requisito 4: Frete Grátis ativado por padrão
        is_active: true,
        category: "geral",
        stock: 999,
        supplier: "amazon",
        product_type: "physical",
        specifications: {
          affiliate_url: finalAffiliateUrl,
          partner: "amazon",
          affiliate_id: AMAZON_AFFILIATE_TAG,
        },
      });

      if (error) throw error;

      toast.success("Produto Amazon publicado com sucesso na vitrine!");
      // Limpa os campos após publicar
      setTitle("");
      setAmazonUrl("");
      setCostPrice("");
      setImageUrl("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar o produto.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // REQUISITO 1: Trava de Segurança por e-mail exclusivo
  if (!currentUserEmail || !ALLOWED_EMAILS.includes(currentUserEmail)) {
    return (
      <div className="mx-auto my-8 max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Acesso Restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta ferramenta de importação direta é exclusiva da administração da HS Digital.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Sessão não autorizada
        </div>
      </div>
    );
  }

  // REQUISITOS 2, 3, 4 e 5: Formulário, Margem 35%, Frete Grátis e Design HS Digital Azul
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-blue-50/30 to-background p-6 dark:border-blue-950 dark:from-blue-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Importador Direto Amazon Associates</h1>
              <p className="text-sm text-muted-foreground">
                Cadastre ofertas com link de afiliado, margem automática de 35% e frete grátis.
              </p>
            </div>
          </div>
          <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/20 dark:text-blue-300">
            ID: {AMAZON_AFFILIATE_TAG}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulário Principal (2 colunas) */}
        <form onSubmit={handlePublish} className="space-y-4 md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* Campo 1: Título */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-title" className="text-sm font-semibold">
              Nome/Título do Produto na Vitrine
            </Label>
            <Input
              id="prod-title"
              placeholder="Ex: Fone de Ouvido Bluetooth JBL Wave Buds"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 focus-visible:ring-blue-600"
              required
            />
          </div>

          {/* Campo 2: Link do Produto */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-url" className="text-sm font-semibold flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4 text-blue-600" /> Link do Produto (SiteStripe da Amazon)
            </Label>
            <Input
              id="prod-url"
              placeholder="Cole o link completo ou amzn.to gerado pelo SiteStripe"
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
              className="h-11 font-mono text-xs focus-visible:ring-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo 3: Preço de Custo */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-cost" className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Preço de Custo na Amazon (R$)
              </Label>
              <Input
                id="prod-cost"
                type="number"
                step="0.01"
                placeholder="Ex: 199.90"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="h-11 font-mono text-sm focus-visible:ring-blue-600"
                required
              />
            </div>

            {/* Campo 4: URL da Imagem */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-img" className="text-sm font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-blue-600" /> URL da Imagem do Produto
              </Label>
              <Input
                id="prod-img"
                placeholder="https://m.media-amazon.com/images/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="h-11 font-mono text-xs focus-visible:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Botão de Ação */}
          <div className="pt-3">
            <Button
              type="submit"
              disabled={submitting || rawCost <= 0}
              className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all"
            >
              {submitting ? (
                "Publicando na Vitrine..."
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Publicar na Vitrine (Margem +35%)
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Card de Simulação e Prévia (1 coluna) */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-sm tracking-wide text-muted-foreground uppercase">
            Resumo da Estrutura
          </h3>

          {/* Prévia da Imagem */}
          <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Prévia"
                className="h-full w-full object-contain p-2"
                onError={(e) => ((e.target as HTMLElement).style.display = "none")}
              />
            ) : (
              <div className="text-center text-xs text-muted-foreground">
                <ImageIcon className="mx-auto h-8 w-8 opacity-40 mb-1" />
                Prévia da Imagem
              </div>
            )}
            <Badge className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px]">
              <Truck className="h-3 w-3 mr-1" /> Frete Grátis
            </Badge>
          </div>

          {/* Cálculo de Margem */}
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Custo original:</span>
              <span className="font-mono">R$ {rawCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-blue-600 font-medium">
              <span>Margem Bruta (35%):</span>
              <span className="font-mono">+ R$ {grossProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
              <span>Preço na Loja:</span>
              <span className="font-mono text-emerald-600">R$ {calculatedSalePrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-blue-600" /> Tag Amazon Anexada:
            </div>
            <p className="mt-1 font-mono text-[11px] opacity-80">{AMAZON_AFFILIATE_TAG}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
