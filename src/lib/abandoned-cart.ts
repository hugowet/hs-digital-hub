import { supabase } from "@/integrations/supabase/client";

export async function trackAbandonedCart(
  productId: string,
  quantity: number,
  source: "carrinho" | "checkout" = "carrinho",
) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return;

  await supabase.from("abandoned_carts").upsert(
    {
      user_id: user.id,
      contact_email: user.email,
      product_id: productId,
      quantity,
      status: "abandonado",
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" },
  );
}

export async function trackCheckoutAbandonment(items: Array<{ productId: string; quantity: number }>) {
  await Promise.all(
    items.map((item) => trackAbandonedCart(item.productId, item.quantity, "checkout")),
  );
}