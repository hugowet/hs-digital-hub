export function montinkFreight(body: any) {
  if (body?.success !== true) throw new Error(body?.msg || "Frete Montink não confirmado.");
  return Object.values(body.shipping_options ?? {}).flatMap((entry: any) => {
    const amount = Number(entry.value), days = Number(entry.business_days);
    if (!entry.name || !Number.isInteger(Number(entry.delivery_method_id)) || !Number.isFinite(amount) || amount < 0 || !Number.isInteger(days) || days < 0) return [];
    return [{ id: String(entry.delivery_method_id), name: String(entry.name), amount, days }];
  });
}

export function montinkData(body: any) {
  if (body?.success !== true || !body.dadosProduto) throw new Error(body?.msg || "Produto Montink não confirmado.");
  const p = body.dadosProduto;
  const parse = (value: unknown) => { try { return typeof value === "string" ? JSON.parse(value) : value ?? {}; } catch { return {}; } };
  const colors = Object.keys(parse(p.cores)).filter(Boolean);
  const sizes = Object.keys(parse(p.tamanhos)).filter(Boolean);
  const stock = Object.values(body.variacoesEstoque ?? {}).reduce<number>((sum, group: any) => sum + Object.values(group ?? {}).reduce<number>((n, v) => n + Math.max(0, Number(v) || 0), 0), 0);
  const price = Number(p.preco_final);
  if (!/^\d+$/.test(String(p.id)) || !p.nomeShopify || !Number.isFinite(price) || price <= 0 || p.preco_variavel === "1") throw new Error("Produto sem preço único confirmado. Confira na Montink.");
  return { id: String(p.id), title: String(p.nomeShopify), price, html: String(p.body_html ?? ""), colors, sizes, stock,
    images: (body.imagens ?? []).filter((i: any) => i.oculto === "0" && i.desabilitado === "0").map((i: any) => ({ url: String(i.url), color: String(i.cor ?? "") })) };
}

export function montinkSeparateShipping(options: Array<{ serviceCode?: string; serviceName?: string; separateShipping?: boolean }>) {
  return options.some(option => option.separateShipping === true);
}