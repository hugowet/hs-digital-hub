import { serve } from "https://deno.land"
import { createClient } from "https://esm.sh"

// Essa é a sua chave definitiva que você ativou na CJdropshipping
const CJ_TOKEN = "CJ5881055@api36cc17f8b9ec4d96a7988da152a5146c.config" 

serve(async (req) => {
  try {
    const { record } = await req.json()

    // O robô dispara quando o pagamento da venda for aprovado e estiver como 'pago'
    if (record && record.status_pagamento === 'pago') {
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 1. Busca os dados de endereço do comprador na tabela de usuarios
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', record.usuario_id)
        .single()

      // 2. Busca o código SKU do produto vendido na tabela de produtos
      const { data: produto } = await supabase
        .from('produtos')
        .select('sku')
        .eq('id', record.produto_id)
        .single()

      if (!usuario || !produto) {
        return new Response(JSON.stringify({ error: "Dados não encontrados no banco" }), { status: 400 })
      }

      // 3. Organiza os dados no padrão que a fábrica da CJdropshipping exige
      const dadosPedido = {
        orderNumber: record.id,
        shippingName: usuario.nome || "Cliente HS Digital",
        shippingCountry: "Brazil",
        shippingProvince: usuario.estado || "Rondônia",
        shippingCity: usuario.cidade || "Rolim Moura",
        shippingAddress: `${usuario.endereco || ''}, ${usuario.numero || ''} - ${usuario.bairro || ''}`,
        shippingZip: usuario.cep ? usuario.cep.replace(/\D/g, '') : "76940000",
        shippingPhone: usuario.telefone || "69999999999",
        consigneeId: usuario.cpf ? usuario.cpf.replace(/\D/g, '') : "", // Seu CPF obrigatório
        products: [
          {
            sku: produto.sku || "SKU_PADRAO",
            quantity: record.quantidade || 1
          }
        ]
      }

      // 4. Envia os dados para a central de pedidos da CJdropshipping
      const respostaCJ = await fetch('https://cjdropshipping.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CJ-Access-Token': CJ_TOKEN
        },
        body: JSON.stringify(dadosPedido)
      })

      const resultado = await respostaCJ.json()
      return new Response(JSON.stringify({ enviado: true, cj_data: resultado }), { status: 200 })
    }

    return new Response(JSON.stringify({ enviado: false, message: "Aguardando pagamento" }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
