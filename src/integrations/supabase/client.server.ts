import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://zxzaehggrybqtxphogmi.supabase.co";

function createSupabaseAdminClient() {
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!serviceRoleKey?.trim()) {
    throw new Error(
      "Falta configurar o segredo SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.",
    );
  }

  return createClient<Database>(SUPABASE_URL, serviceRoleKey.trim(), {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let supabaseAdminClient:
  | ReturnType<typeof createSupabaseAdminClient>
  | undefined;

export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createSupabaseAdminClient>,
  {
    get(_target, property, receiver) {
      if (!supabaseAdminClient) {
        supabaseAdminClient = createSupabaseAdminClient();
      }

      return Reflect.get(supabaseAdminClient, property, receiver);
    },
  },
);
