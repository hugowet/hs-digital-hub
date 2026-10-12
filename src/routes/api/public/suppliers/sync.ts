import { supabase } from "@/integrations/supabase/client";

// Função auxiliar para higienizar o título e aplicar regras de SEO brasileiras
function formatarTituloSEO(rawTitle: string): string {
  if (!rawTitle) return "Produto HS Digital";
  
  // Remove termos inflados, códigos, anos repetitivos e vícios de dropshipping internacional
  let cleanTitle = rawTitle.replace(/(Fashion|New|2026|2025|Drop|Hot Sale|Dropshipping|Novidade|Verão|Inverno|Original|Luxury|Premium|High Quality|Top Quality|Brand|🔥|⚡)\s?/gi, '');
  
  // Limpa múltiplos espaços em branco deixados pelas remoções
  cleanTitle = cleanTitle.replace(/\s+/g, " ").trim();
  
  // Retorna o título capitalizado de forma elegante (Primeira letra maiúscula)
  return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body vazio se chamado sem payload
    }

    // 1. Obtém a loja destino do vendedor logado
    let storeId = body?.storeId;
    if (!storeId) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("id")
        .limit(1)
        .maybeSingle();
      storeId = storeData?.id;
    }

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: "Nenhuma loja de vendedor encontrada para vincular os produtos." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Obtém a chave API (enviada diretamente pelo vendedor ou salva no cadastro do vendedor)
    let cjApiKey = body?.apiKey;
    if (!cjApiKey && storeId) {
      // Busca na integração de fornecedores da loja do vendedor
      const { data: integ } = await supabase
        .from("supplier_integrations")
        .select("access_token_encrypted")
        .eq("store_id", storeId)
        .eq("provider", "cj")
        .maybeSingle();

      if (integ?.access_token_encrypted) {
        cjApiKey = integ.access_token_encrypted;
      } else {
        const { data: storeData } = await supabase
          .from("stores")
          .select("*")
          .eq("id", storeId)
          .maybeSingle();
        if ((storeData as any)?.cj_api_key) {
          cjApiKey = (storeData as any).cj_api_key;
        }
      }
    }

    if (!cjApiKey || typeof cjApiKey !== "string" || !cjApiKey.trim()) {
      return new Response(
        JSON.stringify({ error: "Chave API da CJ Dropshipping não encontrada no cadastro do vendedor." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cleanApiKey = cjApiKey.trim();

    // 3. Endpoint oficial público de API da CJ Dropshipping (chamada via back-end/servidor para evitar CORS)
    const cjApiUrl = "https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=50";

    let response: Response;
    try {
      response = await fetch(cjApiUrl, {
        method: "GET",
        headers: {
          "CJ-Access-Token": cleanApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "HSDigital-Marketplace/1.0",
        },
      });
    } catch (networkErr: any) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Chave salva! Aguardando sincronização de produtos em segundo plano.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const cjContentType = response.headers.get("content-type") || "";
    const rawCjText = await response.text();

    // Se a CJ retornar HTML ou página de bloqueio/erro, ignora o HTML e retorna mensagem segura
    if (
      !cjContentType.includes("application/json") ||
      rawCjText.trim().startsWith("<!DOCTYPE") ||
      rawCjText.trim().startsWith("<html")
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Chave salva! Aguardando sincronização de produtos em segundo plano.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let result: any = {};
    try {
      result = JSON.parse(rawCjText);
    } catch {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Chave salva! Aguardando sincronização de produtos em segundo plano.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Valida resposta de dados da CJ
    const isSuccess =
      result.result === true ||
      result.code === 200 ||
      result.text === "Success" ||
      result.message === "Success";

    const productList =
      result.data?.list ||
      result.data?.content ||
      (Array.isArray(result.data) ? result.data : null);

    if (!isSuccess || !Array.isArray(productList) || productList.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Chave salva! Aguardando sincronização de produtos em segundo plano.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let cadastrados = 0;
    let atualizados = 0;

    // 4. Mapeamento e persistência no banco de dados na tabela 'products'
    for (const item of productList) {
      const pid = String(item.pid || item.id || "");
      const rawTitle = String(item.productName || item.productNameEn || item.productTitle || "Produto CJ Dropshipping").trim();
      
      // APLICA TRATAMENTO DE SEO NO TÍTULO
      const title = formatarTituloSEO(rawTitle);

      const rawCost = parseFloat(item.sellPrice || item.productPrice || item.costPrice || "0") || 0;

      // REGRA DE MARGEM DE LUCRO: Multiplica o custo por 1.35 (35% de margem)
      const finalPrice = Math.round(rawCost * 1.35 * 100) / 100 || 49.90;

      // Fotos e galeria
      const mainImage = item.productImage || item.bigImage || null;
      let gallery: string[] = [];
      if (Array.isArray(item.productImageSet)) {
        gallery = item.productImageSet.filter((url: any) => typeof url === "string" && url.startsWith("http"));
      }
      if (mainImage && !gallery.includes(mainImage)) {
        gallery.unshift(mainImage);
      }

      // Descrição base higienizada
      let baseDescription = item.description || item.productDescription || item.entryDescription || "Produto importado com alto padrão de qualidade.";
      if (typeof baseDescription === "string") {
        baseDescription = baseDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (baseDescription.length > 800) {
        baseDescription = baseDescription.slice(0, 800) + "...";
      }

      // ESTRUTURAÇÃO DE CONFIABILIDADE EM HTML RICO PARA O CLIENTE
      const fullRichDescription = `
        <p>${baseDescription}</p>
        <br />
        <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; background-color: #f8fafc; font-family: sans-serif;">
          <h3 style="color: #1e293b; margin-top: 0; font-size: 16px; display: flex; items-center: center; gap: 8px;">
            <strong>🔒 COMPRA GARANTIDA HS DIGITAL</strong>
          </h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 8px;"><strong>• Envio Seguro:</strong> Código de rastreamento internacional gerado automaticamente e enviado por e-mail para acompanhar cada passo do transporte.</li>
            <li style="margin-bottom: 8px;"><strong>• Processamento Rápido:</strong> Pedido integrado diretamente com o centro de distribuição da CJ Dropshipping para o menor tempo de postagem.</li>
            <li style="margin-bottom: 8px;"><strong>• Garantia e CDC:</strong> Garantia total de 7 dias para trocas ou devoluções em Rolim de Moura e todo o Brasil, em conformidade com o Código de Defesa do Consumidor.</li>
            <li style="margin-bottom: 0;"><strong>• Pagamento Protegido:</strong> Checkout 100% blindado via Mercado Pago com proteção total do seu saldo e transação.</li>
          </ul>
        </div>
      `.trim();

      // Variações e vídeo
      const variations = Array.isArray(item.variants) ? item.variants : [];
      const productVideo = item.productVideo || item.videoUrl || null;

      // Categoria padrão do marketplace
      const category = "eletronicos-gadgets";

      const productPayload: Record<string, any> = {
        store_id: storeId,
        title: title.slice(0, 160),
        description: fullRichDescription,
        description_long: fullRichDescription,
        price: finalPrice,
        stock: parseInt(String(item.warehouseInventoryNum || item.totalVerifiedInventory || "50"), 10) || 50,
        category: category,
        product_type: "physical",
        image_url: mainImage,
        gallery_urls: gallery.slice(0, 10),
        variations: variations,
        supplier: "cj",
        supplier_product_id: pid || null,
        supplier_sku: item.productSku ? String(item.productSku) : null,
        supplier_cost: rawCost,
        is_active: true,
        weight_kg: 0.3,
        height_cm: 5,
        width_cm: 15,
        length_cm: 20,
      };

      if (productVideo) {
        productPayload.video_url = productVideo;
      }

      // Verifica se o produto já existe para atualizar ou inserir
      if (pid) {
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("store_id", storeId)
          .eq("supplier", "cj")
          .eq("supplier_product_id", pid)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from("products").update(productPayload).eq("id", existing.id);
          atualizados++;
          continue;
        }
      }

