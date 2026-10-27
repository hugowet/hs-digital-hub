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
  Video,
  Layers,
  FileText,
  Plus,
  Trash2,
  ListChecks,
  ClipboardPaste,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { calculateFinalPrice, getMarginRate } from "@/lib/pricing";
import { fetchAmazonProduct } from "@/lib/amazon.functions";

const ALLOWED_EMAILS = ["hugoet373@gmail.com", "hugohug12ou@gmail.com"];
const AMAZON_AFFILIATE_TAG = "hsdigitalst0c-20";

/**
 * Tabela Oficial de Margens sobre o Custo:
 * 1. Até R$ 30,00 -> 120%
 * 2. R$ 30,01 até R$ 100,00 -> 60%
 * 3. R$ 100,01 até R$ 300,00 -> 40%
 * 4. R$ 300,01 até R$ 1.000,00 -> 20%
 * 5. R$ 1.000,01 até R$ 2.000,00 -> 14%
 * 6. R$ 2.000,01 até R$ 5.000,00 -> 9%
 * 7. R$ 5.000,01 até R$ 10.000,00 -> 7%
 * 8. R$ 10.000,01 até R$ 30.000,00 -> 5%
 */
export const getAmazonMarginRate = getMarginRate;
export const calculateAmazonFinalPrice = calculateFinalPrice;

interface SpecItem {
  id: string;
  key: string;
  value: string;
}

export function AmazonAffiliateImporter() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [galleryInput, setGalleryInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [specs, setSpecs] = useState<SpecItem[]>([
    { id: "1", key: "Marca", value: "" },
    { id: "2", key: "Modelo", value: "" },
    { id: "3", key: "Voltagem", value: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLink, setFetchingLink] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showBulkBox, setShowBulkBox] = useState(false);
  const [autoFillJson, setAutoFillJson] = useState("");
  const [showAutoFillBox, setShowAutoFillBox] = useState(false);

  // Verificação de Autenticação
  useEffect(() => {
    async function loadUserAndStore() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase() || null;
        setCurrentUserEmail(email);

        if (email && ALLOWED_EMAILS.includes(email) && user) {
          const { data: store } = await supabase
            .from("stores")
            .select("id")
            .eq("owner_id", user.id)
            .maybeSingle();

          if (store) {
            setStoreId(store.id);
          } else {
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

  // Especificações
  const addSpec = () => {
    setSpecs((prev) => [...prev, { id: Math.random().toString(), key: "", value: "" }]);
  };

  const updateSpec = (id: string, field: "key" | "value", val: string) => {
    setSpecs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const removeSpec = (id: string) => {
    setSpecs((prev) => prev.filter((item) => item.id !== id));
  };

  // Puxa título, fotos, descrição, especificações e preço direto do link da Amazon
  const handleFetchFromLink = async () => {
    const url = amazonUrl.trim();
    if (!url) return toast.error("Cole primeiro o link do produto da Amazon.");
    setFetchingLink(true);
    try {
      const data = await fetchAmazonProduct({ data: { url } });
      if (data.title) setTitle(data.title);
      if (data.costPrice > 0) setCostPrice(String(data.costPrice));
      if (data.description) setDescription(data.description);
      if (data.mainImage) setImageUrl(data.mainImage);
      if (data.gallery.length > 0) setGalleryInput(data.gallery.join("\n"));
      const newSpecs: SpecItem[] = Object.entries(data.specs).map(([key, value]) => ({
        id: Math.random().toString(),
        key,
        value: String(value),
      }));
      if (newSpecs.length > 0) setSpecs(newSpecs);
      toast.success("Dados do produto puxados da Amazon! Confira e publique.");
    } catch (err: any) {
      toast.error(err?.message || "Não consegui ler o link da Amazon.");
    } finally {
      setFetchingLink(false);
    }
  };

  // Preenchimento Automático via JSON
  const handleApplyAutoFill = (jsonString?: string) => {
    const raw = jsonString || autoFillJson;
    if (!raw.trim()) return toast.error("Cole o conteúdo extraído da Amazon.");
    try {
      const data = JSON.parse(raw);
      if (data.title) setTitle(data.title);
      if (data.costPrice) setCostPrice(String(data.costPrice));
      if (data.description) setDescription(data.description);
      if (data.mainImage) setImageUrl(data.mainImage);
      if (data.gallery) setGalleryInput(Array.isArray(data.gallery) ? data.gallery.join("\n") : data.gallery);
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      if (data.specs && typeof data.specs === "object") {
        const newSpecs: SpecItem[] = Object.entries(data.specs).map(([key, value]) => ({
          id: Math.random().toString(),
          key,
          value: String(value),
        }));
        if (newSpecs.length > 0) setSpecs(newSpecs);
      }
      setShowAutoFillBox(false);
      setAutoFillJson("");
      toast.success("Campos e especificações preenchidos com sucesso!");
    } catch {
      toast.error("Formato inválido. Certifique-se de colar o JSON copiado pelo script.");
    }
  };

  // Cálculos de Margem Dinâmica com a nova regra
  const rawCost = parseFloat(costPrice.replace(",", ".")) || 0;
  const currentMarginRate = getAmazonMarginRate(rawCost);
  const currentMarginPercent = Math.round(currentMarginRate * 100);
  const calculatedSalePrice = calculateAmazonFinalPrice(rawCost);
  const grossProfit = rawCost > 0 ? Number((calculatedSalePrice - rawCost).toFixed(2)) : 0;

  // Processa as URLs da galeria
  const parsedGalleryUrls = galleryInput
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter((url) => url.startsWith("http"));

  // Formatação do link com a tag de afiliado
  const formatAmazonAffiliateLink = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return "";
    try {
      const parsed = new URL(cleanUrl);
      parsed.searchParams.set("tag", AMAZON_AFFILIATE_TAG);
      return parsed.toString();
    } catch {
      if (cleanUrl.includes("tag=")) {
        return cleanUrl.replace(/tag=[^&]+/, `tag=${AMAZON_AFFILIATE_TAG}`);
      }
      return cleanUrl.includes("?")
        ? `${cleanUrl}&tag=${AMAZON_AFFILIATE_TAG}`
        : `${cleanUrl}?tag=${AMAZON_AFFILIATE_TAG}`;
    }
  };

  // Ação de Publicar Produto Novo
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return toast.error("Informe o título do produto.");
    if (!amazonUrl.trim()) return toast.error("Informe o link da Amazon.");
    if (rawCost <= 0) return toast.error("Informe um preço de custo válido.");
    if (!imageUrl.trim()) return toast.error("Informe a URL da imagem principal.");
    if (!storeId) return toast.error("Nenhuma loja ativa vinculada para receber o produto.");

    setSubmitting(true);
    const finalAffiliateUrl = formatAmazonAffiliateLink(amazonUrl);
    const allGalleryUrls = Array.from(new Set([imageUrl.trim(), ...parsedGalleryUrls]));

    const specsObject: Record<string, string> = {};
    specs.forEach((item) => {
      if (item.key.trim() && item.value.trim()) {
        specsObject[item.key.trim()] = item.value.trim();
      }
    });

    const finalDescription = description.trim() || "Produto oficial importado com garantia e entrega rápida via Amazon.";

    try {
      const payload: any = {
        store_id: storeId,
        title: title.trim(),
        description: finalDescription,
        description_long: finalDescription,
        price: calculatedSalePrice,
        compare_at_price: Number((calculatedSalePrice * 1.25).toFixed(2)),
        supplier_cost: rawCost,
        image_url: imageUrl.trim(),
        gallery_urls: allGalleryUrls,
        free_shipping: true,
        is_active: true,
        category: "geral",
        stock: 999,
        supplier: "amazon",
        product_type: "physical",
        specifications: {
          ...specsObject,
          affiliate_url: finalAffiliateUrl,
          partner: "amazon",
          affiliate_id: AMAZON_AFFILIATE_TAG,
          video_url: videoUrl.trim() || undefined,
        },
      };

      if (videoUrl.trim()) {
        payload.video_url = videoUrl.trim();
      }

      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;

      toast.success("Produto Amazon com especificações publicado na vitrine!");
      setTitle("");
      setAmazonUrl("");
      setCostPrice("");
      setDescription("");
      setImageUrl("");
      setGalleryInput("");
      setVideoUrl("");
      setSpecs([
        { id: "1", key: "Marca", value: "" },
        { id: "2", key: "Modelo", value: "" },
        { id: "3", key: "Voltagem", value: "" },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar o produto.");
    } finally {
      setSubmitting(false);
    }
  };

  // Importação em massa: até 50 produtos por vez.
  // Cada linha aceita JSON ({"url","costPrice","title","mainImage","description","gallery"})
  // ou formato com barras: url | custo | título | imagem
  const BULK_LIMIT = 50;

  const parseBulkLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{")) {
      const data = JSON.parse(trimmed);
      return {
        url: String(data.url || data.amazonUrl || ""),
        cost: Number(data.costPrice ?? data.cost ?? 0),
        title: String(data.title || ""),
        image: String(data.mainImage || data.image || ""),
        description: String(data.description || ""),
        gallery: Array.isArray(data.gallery) ? data.gallery.map(String) : [],
      };
    }
    const parts = trimmed.split("|").map((p) => p.trim());
    if (parts.length < 2) return null;
    return {
      url: parts[0] || "",
      cost: Number(String(parts[1] || "").replace(",", ".")) || 0,
      title: parts[2] || "",
      image: parts[3] || "",
      description: parts[4] || "",
      gallery: parts.slice(5).filter((p) => p.startsWith("http")),
    };
  };

  const handleBulkImport = async () => {
    if (!storeId) return toast.error("Nenhuma loja ativa vinculada para receber os produtos.");
    const lines = bulkInput.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("Cole pelo menos um link ou linha de produto.");
    if (lines.length > BULK_LIMIT) return toast.error(`Máximo de ${BULK_LIMIT} produtos por importação.`);

    setBulkRunning(true);
    let imported = 0;
    const failures: string[] = [];

    for (const line of lines) {
      try {
        const item = parseBulkLine(line);
        if (!item || !item.url || item.cost <= 0) {
          failures.push("Linha inválida (precisa de link e custo): " + line.slice(0, 60));
          continue;
        }
        const salePrice = calculateAmazonFinalPrice(item.cost);
        const title = item.title || "Produto importado Amazon";
        const description = item.description || "Produto oficial importado com garantia e entrega rápida via Amazon.";
        const gallery = Array.from(new Set([item.image, ...item.gallery].filter((u) => u.startsWith("http"))));
        const { error } = await supabase.from("products").insert({
          store_id: storeId,
          title,
          description,
          description_long: description,
          price: salePrice,
          compare_at_price: Number((salePrice * 1.25).toFixed(2)),
          supplier_cost: item.cost,
          image_url: item.image || null,
          gallery_urls: gallery,
          free_shipping: true,
          is_active: true,
          category: "geral",
          stock: 999,
          supplier: "amazon",
          product_type: "physical",
          specifications: {
            affiliate_url: formatAmazonAffiliateLink(item.url),
            partner: "amazon",
            affiliate_id: AMAZON_AFFILIATE_TAG,
          },
        });
        if (error) throw error;
        imported++;
      } catch (err: any) {
        failures.push(err?.message || "Falha ao importar uma linha.");
      }
    }

    setBulkRunning(false);
    if (imported > 0) {
      toast.success(`${imported} produto(s) importado(s) com a Margem Dinâmica aplicada! Compra 100% dentro da HS Digital.`);
      setBulkInput("");
      setShowBulkBox(false);
    }
    if (failures.length > 0) {
      toast.error(`${failures.length} linha(s) não importada(s). Verifique o formato.`);
      console.warn("Falhas na importação em massa:", failures);
    }
  };

  // Recalcular Preço de Todos os Produtos Amazon Já Cadastrados
  const handleRecalculateAllAmazonProducts = async () => {
    if (!confirm("Deseja aplicar a nova regra de preços com terminação ,90 ou ,97 em todos os produtos da Amazon já cadastrados?")) {
      return;
    }

    setRecalculating(true);
    try {
      const { data: prods, error } = await supabase
        .from("products")
        .select("id, title, supplier_cost, price")
        .eq("supplier", "amazon");

      if (error) throw error;
      if (!prods || prods.length === 0) {
        toast.info("Nenhum produto da Amazon encontrado para recalcular.");
        return;
      }

      let updatedCount = 0;
      for (const p of prods) {
        const cost = Number(p.supplier_cost) || 0;
        if (cost > 0) {
          const newPrice = calculateAmazonFinalPrice(cost);
          const newCompareAt = Number((newPrice * 1.25).toFixed(2));
          await supabase
            .from("products")
            .update({
              price: newPrice,
              compare_at_price: newCompareAt,
            })
            .eq("id", p.id);
          updatedCount++;
        }
      }

      toast.success(`${updatedCount} produto(s) da Amazon atualizado(s) com as novas margens!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao recalcular produtos da vitrine.");
    } finally {
      setRecalculating(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-blue-50/30 to-background p-6 dark:border-blue-950 dark:from-blue-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Importador Direto Amazon Associates</h1>
              <p className="text-sm text-muted-foreground">
                Cadastre ofertas com especificações técnicas completas, descrição e margem automática.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={recalculating}
              onClick={handleRecalculateAllAmazonProducts}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
              title="Aplica a nova tabela de preços a todos os produtos Amazon já na vitrine"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${recalculating ? "animate-spin" : ""}`} />
              Recalcular Vitrine Amazon
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBulkBox(!showBulkBox)}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              Importação em Massa (até 50)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAutoFillBox(!showAutoFillBox)}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold"
            >
              <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
              Preenchimento Rápido
            </Button>
            <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/20 dark:text-blue-300">
              ID: {AMAZON_AFFILIATE_TAG}
            </Badge>
          </div>
        </div>

        {/* Caixa de Importação em Massa */}
        {showBulkBox && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-2 dark:border-emerald-900 dark:bg-emerald-950/40">
            <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Cole até 50 produtos, um por linha. Formatos aceitos:
            </Label>
            <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 font-mono">
              link | custo | título | imagem<br />
              ou JSON por linha: {"{\"url\",\"costPrice\",\"title\",\"mainImage\",\"description\"}"}
            </p>
            <Textarea
              rows={6}
              placeholder={"https://www.amazon.com.br/dp/XXXX | 49.90 | Título do produto | https://m.media-amazon.com/images/I/...\nhttps://www.amazon.com.br/dp/YYYY | 129.90 | Outro produto | https://..."}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="text-xs font-mono bg-white dark:bg-background"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                A Margem Dinâmica é aplicada automaticamente e a compra fecha 100% no checkout da HS Digital — o cliente nunca sai para a Amazon.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={bulkRunning}
                onClick={handleBulkImport}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-8 shrink-0"
              >
                {bulkRunning ? "Importando..." : "Importar em Massa"}
              </Button>
            </div>
          </div>
        )}

        {/* Caixa de Preenchimento Rápido */}
        {showAutoFillBox && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2 dark:border-blue-900 dark:bg-blue-950/40">
            <Label className="text-xs font-bold text-blue-900 dark:text-blue-200">
              Cole abaixo os dados gerados pelo Script da Amazon para preencher tudo de uma vez:
            </Label>
            <Textarea
              rows={3}
              placeholder="Cole o JSON copiado da Amazon aqui..."
              value={autoFillJson}
              onChange={(e) => setAutoFillJson(e.target.value)}
              className="text-xs font-mono bg-white dark:bg-background"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => handleApplyAutoFill()}
                className="bg-blue-600 text-white hover:bg-blue-700 text-xs h-8"
              >
                Aplicar aos Campos
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulário Principal */}
        <form onSubmit={handlePublish} className="space-y-4 md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* Nome/Título */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-title" className="text-sm font-semibold">
              Nome/Título do Produto na Vitrine
            </Label>
            <Input
              id="prod-title"
              placeholder="Ex: Ar Condicionado Split Hi Wall LG Dual Inverter Voice 18000 BTUs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 focus-visible:ring-blue-600"
              required
            />
          </div>

          {/* Link do Produto */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-url" className="text-sm font-semibold flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4 text-blue-600" /> Link do Produto (SiteStripe da Amazon)
            </Label>
            <div className="flex gap-2">
              <Input
                id="prod-url"
                placeholder="Cole o link completo ou amzn.to gerado pelo SiteStripe"
                value={amazonUrl}
                onChange={(e) => setAmazonUrl(e.target.value)}
                className="h-11 font-mono text-xs focus-visible:ring-blue-600"
                required
              />
              <Button
                type="button"
                onClick={handleFetchFromLink}
                disabled={fetchingLink || !amazonUrl.trim()}
                className="h-11 shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {fetchingLink ? "Lendo página..." : "Puxar dados"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O botão "Puxar dados" preenche título, fotos, descrição, especificações e preço automaticamente.
            </p>
          </div>

          {/* Preço de Custo e Imagem Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-cost" className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Preço de Custo na Amazon (R$)
              </Label>
              <Input
                id="prod-cost"
                type="number"
                step="0.01"
                placeholder="Ex: 20.00 ou 1500.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="h-11 font-mono text-sm focus-visible:ring-blue-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-img" className="text-sm font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-blue-600" /> URL da Imagem Principal
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

          {/* Descrição do Produto */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-desc" className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-600" /> Descrição do Produto
            </Label>
            <Textarea
              id="prod-desc"
              rows={4}
              placeholder="Cole aqui a descrição detalhada e benefícios do produto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm focus-visible:ring-blue-600 leading-relaxed"
            />
          </div>

          {/* ESPECIFICAÇÕES DO PRODUTO */}
          <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-blue-600" /> Especificações do Produto
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSpec}
                className="h-8 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Linha
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Preencha com detalhes técnicos (ex: Marca, Modelo, Voltagem, Potência, Dimensões).
            </p>

            <div className="space-y-2 pt-2">
              {specs.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Característica (ex: Cor)"
                    value={item.key}
                    onChange={(e) => updateSpec(item.id, "key", e.target.value)}
                    className="h-9 text-xs flex-1 bg-background"
                  />
                  <Input
                    placeholder="Valor (ex: Branco)"
                    value={item.value}
                    onChange={(e) => updateSpec(item.id, "value", e.target.value)}
                    className="h-9 text-xs flex-1 bg-background font-medium"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSpec(item.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Galeria de Fotos */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-gallery" className="text-sm font-semibold flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" /> Fotos Adicionais da Galeria (uma por linha)
            </Label>
            <Textarea
              id="prod-gallery"
              placeholder="https://m.media-amazon.com/images/I/exemplo1.jpg&#10;https://m.media-amazon.com/images/I/exemplo2.jpg"
              value={galleryInput}
              onChange={(e) => setGalleryInput(e.target.value)}
              className="font-mono text-xs min-h-[70px] focus-visible:ring-blue-600"
            />
          </div>

          {/* Vídeo do Produto */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-video" className="text-sm font-semibold flex items-center gap-1.5">
              <Video className="h-4 w-4 text-purple-600" /> URL do Vídeo do Produto (Opcional)
            </Label>
            <Input
              id="prod-video"
              placeholder="https://m.media-amazon.com/.../video.mp4"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-11 font-mono text-xs focus-visible:ring-purple-600"
            />
          </div>

          {/* Botão de Publicação */}
          <div className="pt-2">
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
                  Publicar na Vitrine (Margem +{currentMarginPercent}% · Final R$ {calculatedSalePrice.toFixed(2)})
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Card de Simulação e Prévia */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-sm tracking-wide text-muted-foreground uppercase">
            Resumo da Estrutura
          </h3>

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

          {specs.filter((s) => s.key && s.value).length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
              <span className="font-bold text-foreground">Especificações Inclusas:</span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {specs
                  .filter((s) => s.key && s.value)
                  .map((s, idx) => (
                    <div key={idx} className="flex justify-between border-b border-border/40 pb-0.5 text-[11px]">
                      <span className="text-muted-foreground">{s.key}:</span>
                      <span className="font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Cálculo de Margem */}
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Custo original:</span>
              <span className="font-mono">R$ {rawCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-blue-600 font-medium">
              <span>Margem Dinâmica ({currentMarginPercent}%):</span>
              <span className="font-mono">+ R$ {grossProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
              <span>Preço na Loja:</span>
              <span className="font-mono text-emerald-600 font-extrabold">R$ {calculatedSalePrice.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground text-right italic">
              Terminação comercial: {calculatedSalePrice.toFixed(2).endsWith("97") ? ",97" : ",90"}
            </p>
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
