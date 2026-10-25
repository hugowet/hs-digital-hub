import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
export function AccountNotificationListener() {
  const qc = useQueryClient();
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let disposed = false;
    const connect = async () => {
      const { data } = await supabase.auth.getUser();
      if (channel) { await supabase.removeChannel(channel); channel = undefined; }
      if (disposed || !data.user) return;
      channel = supabase.channel(`account-notifications-${data.user.id}-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "account_notifications", filter: `user_id=eq.${data.user.id}` }, (payload) => {
          void qc.invalidateQueries({ queryKey: ["account-notifications"] }); void qc.invalidateQueries({ queryKey: ["notification-count"] });
          if (payload.eventType === "INSERT") { const row = payload.new as { title: string; body: string }; toast.info(row.title, { description: row.body }); }
        }).subscribe();
    };
    void connect();
    const { data: auth } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => { void connect(); }, 0); });
    return () => { disposed = true; auth.subscription.unsubscribe(); if (channel) void supabase.removeChannel(channel); };
  }, [qc]);
  return null;
}
