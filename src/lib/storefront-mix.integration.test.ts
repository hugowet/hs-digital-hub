import { expect, test } from "vitest";

test("Todos retorna quatro nacionais por internacional e pagina sem repetir", async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configuração pública necessária para conferir vitrine real.");
  async function read(path: string) {
    const response = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key ?? "" } });
    expect(response.ok).toBe(true);
    return response.json();
  }
  const first = await read("rpc/daily_storefront_selection?p_offset=0&p_limit=20");
  const next = await read("rpc/daily_storefront_selection?p_offset=20&p_limit=20");
  const whole = await read("rpc/daily_storefront_selection?p_offset=0&p_limit=40");
  expect(first.ids).toHaveLength(20);
  expect([...first.ids, ...next.ids]).toEqual(whole.ids);
  expect(new Set(whole.ids).size).toBe(whole.ids.length);
  const products = await read(`products?select=id,supplier&id=in.(${first.ids.join(",")})`);
  const byId = new Map(products.map((p: {id: string; supplier: string}) => [p.id, p.supplier]));
  expect(first.ids.map((id: string) => byId.get(id))).toEqual(Array.from({ length: 20 }, (_, i) => i % 5 === 4 ? "cj" : "amazon"));
});