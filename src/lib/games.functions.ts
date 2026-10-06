import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const gameSchema = z.object({ gameType: z.enum(["wheel", "scratch"]) });
const arcadeSchema = z.object({ gameType: z.enum(["snake", "pacman", "flappy", "highway"]) });

export const playDailyGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => gameSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("play_daily_game", {
      _game_type: data.gameType,
    });
    if (error) throw new Error(error.message);
    const reward = result?.[0];
    if (!reward) throw new Error("Não foi possível registrar a jogada.");
    return reward;
  });

export const getGameStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: buyer }, { data: seller }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "buyer" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seller" }),
    ]);
    if (!buyer || seller) throw new Error("Jogos disponíveis somente para compradores.");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const { data, error } = await context.supabase
      .from("game_plays")
      .select("game_type,outcome")
      .eq("played_on", today);
    if (error) throw error;
    const { data: wallet } = await context.supabase.from("user_game_wallets").select("lifetime_coins").maybeSingle();
    return {
      wheel: data?.find((play) => play.game_type === "wheel")?.outcome ?? null,
      scratch: data?.find((play) => play.game_type === "scratch")?.outcome ?? null,
      coins: wallet?.lifetime_coins ?? 0,
    };
  });

export const startArcadeGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => arcadeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("start_arcade_game", {
      _game_type: data.gameType,
    });
    if (error) throw new Error(error.message);
    return result?.[0];
  });

export const finishArcadeGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ sessionId: z.string().uuid(), coins: z.number().int().min(0).max(10000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("finish_arcade_game", {
      _session_id: data.sessionId,
      _coins: data.coins,
    });
    if (error) throw new Error(error.message);
    return result?.[0];
  });

export const getMyCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: buyer }, { data: seller }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "buyer" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seller" }),
    ]);
    if (!buyer || seller) throw new Error("Cupons de jogos disponíveis somente para compradores.");
    const { data, error } = await context.supabase
      .from("user_coupons")
      .select("id,code,kind,percent_off,max_discount,status,source,expires_at,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
