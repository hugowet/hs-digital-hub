import { supabase } from "@/integrations/supabase/client";

const AFFILIATE_STORAGE_KEY = "hs_affiliate_ref";

// Captura automaticamente o código de afiliado na URL (?ref=... ou ?afiliado=...)
export function initAffiliateTracking() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("afiliado");
    if (ref && ref.trim().length > 0) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem(AFFILIATE_STORAGE_KEY, cleanRef);
      // Salva cookie de 30 dias para persistência
      document.cookie = `hs_affiliate_ref=${cleanRef}; path=/; max-age=${30 * 24 * 60 * 60}`;
    }
  } catch (e) {
    console.error("Erro ao inicializar tracking de afiliados:", e);
  }
}

// Retorna o código do afiliado que indicou esta sessão
export function getActiveAffiliateRef(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AFFILIATE_STORAGE_KEY) || null;
}

// Registra comissão automática de 10% do produto quando um pedido é criado
export async function recordAffiliateCommission({
  orderId,
  productsSubtotal,
  buyerId,
}: {
  orderId: string;
  productsSubtotal: number;
  buyerId?: string;
}) {
  const affiliateRef = getActiveAffiliateRef();
  if (!affiliateRef || productsSubtotal <= 0) return null;

  // Regra definida:
  // Taxa total vendedor: 24% (sobre produtos)
  // Afiliado: 10%
  // Gateway/Taxas: 5%
  // HS Digital Líquido: 9%
  const commissionRate = 0.10; // 10%
  const commissionAmount = Math.round(productsSubtotal * commissionRate * 100) / 100;

  try {
    const commissionRecord = {
      order_id: orderId,
      affiliate_code: affiliateRef,
      buyer_id: buyerId || null,
      subtotal_products: productsSubtotal,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_fee_rate: 0.24,
      gateway_reserve_rate: 0.05,
      platform_net_rate: 0.09,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    // Tenta gravar na tabela affiliate_commissions do Supabase (com fallback em localStorage)
    const { error } = await (supabase as any)
      .from("affiliate_commissions")
      .insert(commissionRecord);

    if (error) {
      console.warn("Tabela affiliate_commissions não encontrada no banco, salvando backup local:", error.message);
      const existing = JSON.parse(localStorage.getItem("hs_offline_commissions") || "[]");
      existing.push(commissionRecord);
      localStorage.setItem("hs_offline_commissions", JSON.stringify(existing));
    }

    return commissionRecord;
  } catch (err) {
    console.error("Falha ao registrar comissão de afiliado:", err);
    return null;
  }
}
