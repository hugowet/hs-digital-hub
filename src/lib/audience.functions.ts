import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso de administrador necessário.");
}

export type AudienceStats = {
  onlineNow: number;
  totalAccounts: number;
  newToday: number;
  signupsByDay: Array<{ day: string; count: number }>;
  viewingNow: number;
  viewsToday: number;
  views7d: number;
  views30d: number;
  uniqueVisitors30d: number;
  viewsByDay: Array<{ day: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
};

export const getAudienceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AudienceStats> => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = Date.now();
    const onlineSince = new Date(now - 45_000).toISOString();
    const viewingSince = new Date(now - 5 * 60_000).toISOString();
    const historySince = new Date(now - 13 * 86_400_000);
    historySince.setUTCHours(0, 0, 0, 0);
    const viewsSince = new Date(now - 29 * 86_400_000);
    viewsSince.setUTCHours(0, 0, 0, 0);

    const [online, total, recent, views] = await Promise.all([
      supabaseAdmin
        .from("social_presence")
        .select("user_id", { count: "exact", head: true })
        .gte("last_seen_at", onlineSince),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("created_at")
        .gte("created_at", historySince.toISOString()),
      supabaseAdmin
        .from("site_page_views")
        .select("path,session_id,created_at")
        .gte("created_at", viewsSince.toISOString())
        .order("created_at", { ascending: false })
        .limit(50000),
    ]);

    const byDay = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(historySince.getTime() + i * 86_400_000);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of recent.data ?? []) {
      const key = String(row.created_at).slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const weekSince = new Date(now - 6 * 86_400_000);
    weekSince.setUTCHours(0, 0, 0, 0);
    const weekKey = weekSince.toISOString().slice(0, 10);

    const viewsByDayMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(historySince.getTime() + i * 86_400_000);
      viewsByDayMap.set(d.toISOString().slice(0, 10), 0);
    }
    const pageCounts = new Map<string, number>();
    const visitors = new Set<string>();
    const activeNow = new Set<string>();
    let viewsToday = 0;
    let views7d = 0;
    let views30d = 0;
    for (const row of views.data ?? []) {
      const key = String(row.created_at).slice(0, 10);
      views30d += 1;
      visitors.add(String(row.session_id));
      if (viewsByDayMap.has(key)) viewsByDayMap.set(key, (viewsByDayMap.get(key) ?? 0) + 1);
      if (key === todayKey) viewsToday += 1;
      if (key >= weekKey) views7d += 1;
      pageCounts.set(row.path, (pageCounts.get(row.path) ?? 0) + 1);
      if (String(row.created_at) >= viewingSince) activeNow.add(String(row.session_id));
    }

    return {
      onlineNow: online.count ?? 0,
      totalAccounts: total.count ?? 0,
      newToday: byDay.get(todayKey) ?? 0,
      signupsByDay: [...byDay.entries()].map(([day, count]) => ({ day, count })),
      viewingNow: activeNow.size,
      viewsToday,
      views7d,
      views30d,
      uniqueVisitors30d: visitors.size,
      viewsByDay: [...viewsByDayMap.entries()].map(([day, count]) => ({ day, count })),
      topPages: [...pageCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, count]) => ({ path, count })),
    };
  });

export type AudienceAccount = { id: string; name: string | null; email: string | null; createdAt: string };

export const listAudienceAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AudienceAccount[]> => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accounts: AudienceAccount[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("Não foi possível carregar as contas.");
      for (const u of data.users) {
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        accounts.push({
          id: u.id,
          email: u.email ?? null,
          name: (meta.full_name as string) || (meta.name as string) || null,
          createdAt: u.created_at,
        });
      }
      if (data.users.length < 1000) break;
    }
    const ids = accounts.map((a) => a.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids.slice(i, i + 500));
      const names = new Map((data ?? []).map((p) => [p.id, p.full_name]));
      for (const a of accounts) if (names.get(a.id)) a.name = names.get(a.id) ?? a.name;
    }
    return accounts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
