import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// FORÇA O MOTOR DO MARKETPLACE A IGNORAR SIMULAÇÕES E RODAR APENAS EM PRODUÇÃO REAL
const IS_PRODUCTION = true;

interface PaymentPayload {
  pedidoId: string;
  total: number;
  email: string;
  cpf: string;
  nome: string;
}

export async function processarPagamentoRealMercadoPago(payload: PaymentPayload) {
  // Puxa as variáveis de ambiente oficiais injetadas com chaves reais
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || "https://supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // BARREIRA DE SEGURANÇA: Bloqueia a transação na hora se o sistema tentar usar credenciais falsas ou de teste
  if (!accessToken || accessToken.startsWith("TEST-")) {
    throw new Error(
      "FALHA CRÍTICA DE PRODUÇÃO: O Mercado Pago detectou chaves de teste (TEST-). Altere para credenciais reais de produção (APP_USR-).",
    );
  }

  try {
    // 1. DISPARA A REQUISIÇÃO REAL DIRETAMENTE PARA A API OFICIAL DO MERCADO PAGO
    const response = await fetch("https://mercadopago.com", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": payload.pedidoId, // TRAVA ANTI-DUPLICIDADE: Impede que o cliente seja cobrado duas vezes por cliques repetidos
      },
      body: JSON.stringify({
        transaction_amount: Number(payload.total),
        description: `Pedido #${payload.pedidoId} - HS Digital Marketplace`,
        payment_method_id: "pix", // Força o recebimento instantâneo em Pix Real
        notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`, // Destino real para atualizar o status do pedido
        payer: {
          email: payload.email,
          first_name: payload.nome,
          identification: {
            type: "CPF",
            number: payload.cpf.replace(/\D/g, ""), // Limpa pontos e traços do CPF real
          },
        },
      }),
    });

    const resultado = await response.json();

    if (!response.ok) {
      console.error("Erro retornado pela API do Mercado Pago:", resultado);
      throw new Error(resultado.message || "Erro ao gerar cobrança real.");
    }

    // 2. ATUALIZA O STATUS DO PEDIDO PARA "PENDENTE" NO SUPABASE AGUARDANDO O PIX
    if (supabaseServiceKey) {
      const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin.from("orders").update({ status_pagamento: "pendente" }).eq("id", payload.pedidoId);
    }

    // Retorna os dados do Pix Real (QR Code e Linha Digitável) para o seu aplicativo exibir na tela
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
