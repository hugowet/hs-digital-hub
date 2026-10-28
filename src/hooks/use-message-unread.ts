import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMessageUnread(userId?: string | null) {
  return useQuery({
    queryKey: ["message-unread", userId], enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return { buyer: 0, seller: 0, products: [] as string[] };
      const { data, error } = await supabase.from("product_messages")
        .select("conversation_id,product_conversations!inner(buyer_id,product_id)")
        .is("read_at", null).neq("sender_id", userId);
      if (error) throw error;
      const buyerRows = (data ?? []).filter(row => row.product_conversations.buyer_id === userId);
      return { buyer: buyerRows.length, seller: (data ?? []).length - buyerRows.length, products: [...new Set(buyerRows.map(row => row.product_conversations.product_id))] };
    },
    staleTime: 10_000, refetchInterval: 15_000,
  });
}