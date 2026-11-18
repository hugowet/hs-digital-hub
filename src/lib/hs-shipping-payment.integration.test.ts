import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "vitest";

// Run with a disposable buyer session; no provider payment is created.
test.runIf(Boolean(process.env.HS_SHIPPING_TEST_SESSION_FILE))("pedido real de R$7,47 cobra R$9,90 de frete uma única vez", async () => {
  const sessionFile = process.env.HS_SHIPPING_TEST_SESSION_FILE;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!sessionFile || !url || !key) throw new Error("Disposable session and public configuration required");
  const { session } = JSON.parse(readFileSync(sessionFile, "utf8"));
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: authError } = await client.auth.setSession(session);
  if (authError) throw authError;
  const { data: id, error } = await client.rpc("create_marketplace_checkout", {
    _items: [{ product_id: "234581ac-4b57-4338-bb00-cfbe087d282a", quantity: 1 }],
    _shipping_address: { name: "Teste sem envio", address: "Endereco de teste sem envio", city: "Boa Vista", postal_code: "69301000" },
    _shipping_quote_ids: { "8bc94f28-2c61-4de2-97d3-596d80ebae06": "568dfbe8-ae35-40c0-b0f2-f9ab51fa2802" },
  });
  if (error) throw error;
  if (!id) throw new Error("Order was not created");
  const { data: order } = await client.from("orders").select("total,shipping_address").eq("id", id).single();
  const { data: transactions } = await client.from("payment_transactions").select("gross_amount,platform_fee,seller_amount,provider_payment_id").eq("order_id", id);
  expect(Number(order?.total)).toBe(17.37);
  expect(Number(order?.shipping_address?.shipping_total)).toBe(9.9);
  expect(transactions).toHaveLength(1);
  expect(Number(transactions?.[0]?.gross_amount)).toBe(17.37);
  expect(Number(transactions?.[0]?.platform_fee)).toBe(0.9);
  expect(Number(transactions?.[0]?.seller_amount)).toBe(16.47);
  expect(transactions?.[0]?.provider_payment_id).toBeNull();
}, 30_000);