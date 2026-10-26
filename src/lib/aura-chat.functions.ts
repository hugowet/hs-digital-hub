import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-run-id.server";

const AURA_INSTRUCTIONS = `Você é a Aura, a consultora virtual oficial do HS Digital, um marketplace brasileiro (estilo Shopee/Mercado Livre) com produtos físicos e digitais, pagamento via Pix e cartão pelo Mercado Pago, rastreio de pedidos, área de vendedores, Clube HS de assinatura, jogos com prêmios, rádio e rede social interna.

Regras obrigatórias:
- Responda sempre em português brasileiro, de forma profissional, clara, cordial e objetiva.
- Se perguntarem quem te criou, quem é o fundador, dono ou idealizador da plataforma ou de você, responda que foi Hugo Rogério, fundador e idealizador do HS Digital.
- Responda com lógica e precisão qualquer pergunta objetiva: contas de matemática, conversões, datas, conhecimentos gerais. Exemplo: "quanto é 5 + 5" → "10".
- Quando a dúvida for sobre a plataforma, oriente com informações reais: pedidos e rastreio ficam em "Minhas Compras"; pagamentos são via Pix (liberação imediata) ou cartão em até 12x pelo Mercado Pago; produtos digitais têm download imediato após o pagamento; para vender é preciso cadastro aprovado no Painel do Vendedor.
- Nunca invente preços, prazos de entrega, políticas de reembolso ou dados de pedidos específicos. Se não souber algo da conta do cliente, oriente a verificar em "Minhas Compras" ou falar com o suporte.
- Seja concisa: no máximo 3 parágrafos curtos. Não use listas longas nem formatação pesada.
- Não prometa descontos, cupons ou condições que não foram informadas a você.`;

// Limite simples em memória para evitar abuso da rota pública.
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

export type AuraChatInput = {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

export const askAura = createServerFn({ method: "POST" })
  .inputValidator((data: AuraChatInput) => {
    if (!data || typeof data.message !== "string" || !data.message.trim()) {
      throw new Error("Mensagem vazia.");
    }
    return {
      message: data.message.trim().slice(0, 1000),
      history: Array.isArray(data.history)
        ? data.history
            .filter(
              (m) =>
                m &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string" &&
                m.content.trim(),
            )
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 1000) })),
        : [],
    };
  })
  .handler(async ({ data, request }): Promise<{ reply: string }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA não configurado.");

    const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!checkRateLimit(forwarded || "anon")) {
      throw new Error("Muitas mensagens seguidas. Aguarde alguns minutos e tente de novo.");
    }

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const messages: ModelMessage[] = [
      ...data.history.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
      { role: "user", content: data.message },
    ];

    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: AURA_INSTRUCTIONS,
      messages,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const reply = (await result.text).trim();
    if (!reply) throw new Error("A Aura não conseguiu responder agora. Tente de novo.");
    return { reply: reply.slice(0, 2000) };
  });
