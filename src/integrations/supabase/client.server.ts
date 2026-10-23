import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://vrsmsssmzxuwktrztgex.supabase.co";

function createSupabaseAdminClient() {
  // Coloque a chave copiada diretamente entre as aspas abaixo:
  const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emFlaGdncnlicXR4cGhvZ21pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjM0MjgyOCwiZXhwIjoyMTA3OTE4ODI4fQ.G_Gsat7Hyy2A-8HqTBP9jzfHxC7z87fy-GpDnuJEM3o";

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
