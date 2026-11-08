import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  montink_product_id: number;
  quantity: number;
  price: number;
  size?: string; // var1 (ex: P, M, G, GG ou ÚNICO)
  color?: string; // var2 (ex: Branco, Preto)
  sku?: string | number;
}

interface FulfillmentRequest {
  external_order_id: string;
  payment_status: "approved" | "paid" | string;
  customer: {
    name: string;
    email: string;
    document: string; // CPF/CNPJ
    phone: string;
  };
  address: {
    zipcode: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string; // Ex: SP, RJ, MG (2 letras)
    complement?: string;
  };
  items: OrderItem[];
  shipping_id?: number;
}

// Higienização de documento (apenas dígitos)
function sanitizeDigits(val: string): string {
  return (val || "").replace(/\D/g, "");
}

// Formatação do telefone para o padrão preferencial da Montink: (DD) 90000-0000
function formatPhone(phone: string): string {
  const digits = sanitizeDigits(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const montinkToken = Deno.env.get("MONTINK_API_TOKEN");
    if (!montinkToken) {
      throw new Error("Variável de ambiente MONTINK_API_TOKEN não está configurada.");
    }

    const payload: FulfillmentRequest = await req.json();

    // 1. Garantir que o pedido só é despachado se o pagamento estiver aprovado
    const isApproved = ["approved", "paid", "pago", "aprovado"].includes(
      payload.payment_status?.toLowerCase()
    );

    if (!isApproved) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Pagamento com status '${payload.payment_status}'. O pedido Montink só é criado após aprovação.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2. Filtrar apenas produtos com ID da estampa Montink
    const montinkProducts = payload.items.filter((item) => !!item.montink_product_id);

    if (montinkProducts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nenhum produto de estampa da Montink encontrado neste pedido.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 3. Montar o payload no padrão oficial da API Montink (create_order)
    const totalValue = montinkProducts.reduce(
      (acc, item) => acc + Number(item.price) * Number(item.quantity),
      0
    );

    const montinkOrderPayload = {
      customer_name: payload.customer.name.trim(),
      customer_email: payload.customer.email.trim().toLowerCase(),
      customer_document: sanitizeDigits(payload.customer.document),
      customer_phone: formatPhone(payload.customer.phone),
      payment_method: "pix",
      value_total: Number(totalValue.toFixed(2)),
      external_order_id: String(payload.external_order_id),
      ...(payload.shipping_id ? { shipping_id: payload.shipping_id } : {}),
      address: {
        zipcode: payload.address.zipcode.replace(/\D/g, "").replace(/^(\d{5})(\d{3})$/, "$1-$2"),
        street: payload.address.street.trim(),
        number: String(payload.address.number).trim(),
        neighborhood: payload.address.neighborhood.trim(),
        city: payload.address.city.trim(),
        state: payload.address.state.trim().toUpperCase().slice(0, 2),
        complement: payload.address.complement?.trim() || "",
      },
      products: montinkProducts.map((p) => ({
        product_id: Number(p.montink_product_id),
        quantity: Number(p.quantity),
        price: Number(p.price),
        var1: p.size || "ÚNICO",
        var2: p.color || "Padrão",
        var3: null,
        ...(p.sku ? { sku: p.sku } : {}),
      })),
    };

    console.log("Enviando pedido para a Montink:", JSON.stringify(montinkOrderPayload, null, 2));

    // 4. Chamada POST para https://api.montink.com/create_order
    // Observação: a Montink utiliza o cabeçalho 'Authorizationtoken' para validar a chamada
    const response = await fetch("https://api.montink.com/create_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorizationtoken: montinkToken,
        Authorization: `Bearer ${montinkToken}`, // enviado por redundância
      },
      body: JSON.stringify(montinkOrderPayload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("Erro retornado pela Montink:", response.status, responseData);
      return new Response(
        JSON.stringify({
          success: false,
          status: response.status,
          error: responseData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }

    console.log("Pedido criado com sucesso na Montink:", responseData);

    return new Response(
      JSON.stringify({
        success: true,
        external_order_id: payload.external_order_id,
        montink_response: responseData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Erro na Edge Function de fulfillment Montink:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
