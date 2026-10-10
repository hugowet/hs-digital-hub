import { supabase } from "@/integrations/supabase/client";

export async function POST(req: Request) {
  try {
    // 1. Busca a chave que salvamos na tabela site_settings no Supabase
    const { data: setting, error: dbError } = await supabase
      .from('site_settings')
      .select('key_value')
      .eq('key_name', 'cj_api_key')
      .single();

    if (dbError || !setting?.key_value) {
      return new Response(
        JSON.stringify({ error: "Chave API da CJ não encontrada no banco de dados." }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Chama a API oficial da CJ Dropshipping para buscar os produtos
    const response = await fetch('https://cjdropshipping.com', {
      method: 'GET',
      headers: {
        'CJ-Access-Token': setting.key_value,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    // Valida se a CJ respondeu com sucesso
    if (result.text !== "Success" && result.message !== "Success" || !result.data?.list) {
      return new Response(
        JSON.stringify({ error: "Falha na autenticação ou resposta da API da CJ." }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const produtosCJ = result.data.list;
    let cadastrados = 0;

    // 3. Varre a lista de produtos e insere na sua tabela 'products' do Supabase
    for (const item of produtosCJ) {
      const { error: insertError } = await supabase.from('products').insert({
        name: item.productName,
        price: parseFloat(item.productPrice || 0),
        image: item.productImage,
        description: `Produto importado via CJ Dropshipping. SKU: ${item.productSku}`,
        status: 'active'
        // Nota: Se suas colunas no Supabase tiverem nomes diferentes (ex: title, image_url), altere os nomes da esquerda.
      });

      if (!insertError) cadastrados++;
    }

    return new Response(
      JSON.stringify({ success: true, message: `${cadastrados} produtos sincronizados com sucesso!` }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno no servidor." }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
