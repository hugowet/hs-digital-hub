import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getHsBank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: store, error } = await context.supabase.from("stores")
      .select("id,name,status,balance,mercado_pago_status").eq("owner_id", context.userId).maybeSingle();
    if (error) throw new Error("Não foi possível consultar sua carteira.");
    if (!store || store.status !== "approved") return { store: null, transactions: [], held: 0, eligible: false, request: null };
    const [history, heldRows, eligibility, request] = await Promise.all([
      context.supabase.from("payment_transactions")
        .select("id,order_id,gross_amount,platform_fee,seller_amount,status,paid_at,created_at,orders(payout_status)")
        .eq("store_id", store.id).order("created_at", { ascending: false }).limit(50),
      context.supabase.from("payment_transactions")
        .select("seller_amount,orders!inner(payout_status)").eq("store_id", store.id)
        .eq("status", "approved").eq("orders.payout_status", "held"),
      context.supabase.rpc("hs_bank_credit_eligible", { _store_id: store.id }),
      context.supabase.from("hs_bank_credit_requests").select("id,status,created_at").eq("store_id", store.id).maybeSingle(),
    ]);
    if (history.error || heldRows.error || eligibility.error || request.error) throw new Error("Não foi possível atualizar o extrato. Tente novamente.");
    return {
      store: { id: store.id, name: store.name, balance: Number(store.balance), connected: store.mercado_pago_status === "connected" },
      transactions: (history.data ?? []).map((tx) => ({
        id: tx.id, orderId: tx.order_id, gross: Number(tx.gross_amount), fee: Number(tx.platform_fee),
        net: Number(tx.seller_amount), status: tx.status, date: tx.paid_at ?? tx.created_at,
        released: tx.orders?.payout_status === "released",
      })),
      held: (heldRows.data ?? []).reduce((sum, tx) => sum + Number(tx.seller_amount), 0),
      eligible: eligibility.data === true,
      request: request.data,
    };
  });

export const requestHsBankCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hs_bank_request_credit", { _store_id: data.storeId });
    if (error || !id) throw new Error("Solicitação indisponível: é necessário ter vendas pagas nos últimos 30 dias e loja aprovada.");
    return { id };
  });