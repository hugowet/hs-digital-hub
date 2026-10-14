import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Força a validação de tipos no escopo global para ambientes que injetam variáveis
declare const process: {
  env: {
    MERCADO_PAGO_ACCESS_TOKEN?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  };
};

interface PaymentPayload {
  pedidoId: string;
  total: number;
  email: string;
  cpf: string;
  nome: string;
  valorFreteOriginal: number;
}

export async function processarPagamentoRealMercadoPago(payload: PaymentPayload) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || "https://supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || accessToken.startsWith("TEST-")) {
    throw new Error(
      "FALHA CRÍTICA DE PRODUÇÃO: O Mercado Pago detectou chaves de teste (TEST-). Altere para credenciais reais de produção (APP_USR-).",
    );
  }

  // 🎯 REGRA DE BACKEND: FRETE GRÁTIS AUTOMÁTICO PARA O ADMINISTRADOR HUGO
  let totalFinal = Number(payload.total);
  const emailAdmin = "hugoet373@gmail.com";

  if (payload.email.toLowerCase().trim() === emailAdmin.toLowerCase().trim()) {
    totalFinal = totalFinal - Number(payload.valorFreteOriginal || 0);
    console.log(
      `[HS DIGITAL - FRETE GRÁTIS ADMIN] Administrador detectado: ${payload.email}. Descontando valor do frete do Pix final.`,
    );
  }

  try {
    // 🌐 Corrigido para o endpoint oficial de pagamentos do Mercado Pago v1
    const response = await fetch("https://mercadopago.com", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": payload.pedidoId,
      },
      body: JSON.stringify({
        transaction_amount: Number(totalFinal.toFixed(2)), // Garante precisão decimal monetária
        description: `Pedido #${payload.pedidoId} - HS Digital Marketplace`,
        payment_method_id: "pix",
        notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
        payer: {
          email: payload.email,
          first_name: payload.nome,
          identification: {
            type: "CPF",
            number: payload.cpf.replace(/\D/g, ""),
          },
        },
      }),
    });

    const resultado = await response.json();

    if (!response.ok) {
      console.error("Erro retornado pela API do Mercado Pago:", resultado);
      throw new Error(resultado.message || "Erro ao gerar cobrança real.");
    }

    if (supabaseServiceKey) {
      const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
      // Ajustado o type casting para evitar conflito com os enums estritos do Database Types
      await supabaseAdmin
        .from("orders")
        .update({ status_pagamento: "pendente" as any })
        .eq("id", payload.pedidoId);
    }

    return {
      sucesso: true,
      pagamentoId: resultado.id,
      qrCode: resultado.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: resultado.point_of_interaction?.transaction_data?.qr_code_base64,
      copiaECola: resultado.point_of_interaction?.transaction_data?.qr_code,
      status: resultado.status,
    };
  } catch (error: any) {
    console.error("Falha fatal na varredura financeira de produção:", error);
    return {
      sucesso: false,
      erro: error.message || "Falha na comunicação com o processador de pagamentos real.",
    };
  }
}
