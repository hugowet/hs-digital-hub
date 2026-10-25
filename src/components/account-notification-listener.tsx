import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
export function AccountNotificationListener() {
  const qc = useQueryClient();
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let disposed = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let generation = 0;
    const pulse = () => { if (!disposed && document.visibilityState === "visible") void supabase.rpc("social_heartbeat").then(() => {}); };
    const connect = async () => {
      const current = ++generation;
      const { data } = await supabase.auth.getUser();
      if (disposed || current !== generation) return;
      if (heartbeat) { clearInterval(heartbeat); heartbeat = undefined; }
      if (channel) { await supabase.removeChannel(channel); channel = undefined; }
      if (disposed || current !== generation || !data.user) return;
      pulse();
      heartbeat = setInterval(pulse, 15000);
      channel = supabase.channel(`account-notifications-${data.user.id}-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "account_notifications", filter: `user_id=eq.${data.user.id}` }, (payload) => {
          void qc.invalidateQueries({ queryKey: ["account-notifications"] }); void qc.invalidateQueries({ queryKey: ["notification-count"] });
          if (payload.eventType === "INSERT") { const row = payload.new as { title: string; body: string }; toast.info(row.title, { description: row.body }); }
        }).subscribe();
    };
    void connect();
    document.addEventListener("visibilitychange", pulse);
    const { data: auth } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => { void connect(); }, 0); });
    return () => { disposed = true; generation++; document.removeEventListener("visibilitychange", pulse); if (heartbeat) clearInterval(heartbeat); auth.subscription.unsubscribe(); if (channel) void supabase.removeChannel(channel); };
  }, [qc]);
  return null;
}
