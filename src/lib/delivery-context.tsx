import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { savedDeliveryPostalCode } from "./delivery-address";

type DeliveryAddress = {
  postal_code: string | null;
  is_default: boolean;
  recipient_name: string | null;
  phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
};
const DeliveryContext = createContext<{
  userId: string | null;
  postalCode: string;
  address: DeliveryAddress | null;
  loading: boolean;
}>({ userId: null, postalCode: "", address: null, loading: true });

/** One identity/address observer for all visible product quotes and checkout. */
export function DeliveryProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const user = useQuery({
    queryKey: ["delivery-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 60_000,
  });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      qc.setQueryData(["delivery-user"], session?.user.id ?? null);
      if (event === "SIGNED_OUT") qc.removeQueries({ queryKey: ["cj-delivery-price"] });
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  const userId = user.data ?? null;
  const addresses = useQuery({
    queryKey: ["my-addresses", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("user_addresses").select("*")
        .eq("user_id", userId).order("is_default", { ascending: false }).order("created_at");
      if (error) throw error;
      return (data ?? []) as DeliveryAddress[];
    },
    staleTime: 60_000,
  });
  const rows = addresses.data ?? [];
  const address = rows.find((entry) => entry.is_default) ?? rows[0] ?? null;
  return <DeliveryContext.Provider value={{ userId, address,
    postalCode: userId ? savedDeliveryPostalCode(rows) : "",
    loading: user.isPending || Boolean(userId && addresses.isPending),
  }}>{children}</DeliveryContext.Provider>;
}

export const useDeliveryAddress = () => useContext(DeliveryContext);