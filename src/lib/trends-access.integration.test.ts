import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const enabled = process.env.TRENDS_ACCESS_TEST === "1";
describe.skipIf(!enabled)("acesso real aos registros HS Trends", () => {
  const session = enabled ? JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8")).session : null;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const post = "ebaf2024-545b-4e60-aff5-35a23f6cfd5c";
  async function request(path: string, authenticated: boolean, body?: unknown) {
    if (!url || !key || !session) throw new Error("Configuração de teste ausente.");
    return fetch(`${url}/rest/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: { apikey: key, ...(authenticated ? { Authorization: `Bearer ${session.access_token}` } : {}), "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  it.each(["trend_comments", "trend_likes", "trend_follows"])("bloqueia leitura anônima de %s", async table => {
    const response = await request(`${table}?select=*&limit=1`, false);
    expect(response.status).toBe(401);
  });
  it("permite comentários apenas do post solicitado pela consulta autenticada", async () => {
    const response = await request("rpc/read_trend_comments", true, { _video_id: post });
    expect(response.status).toBe(200);
    const rows = await response.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(100);
    for (const row of rows) expect(row.video_id).toBe(post);
  });
  it("bloqueia a consulta de comentários sem sessão", async () => {
    expect((await request("rpc/read_trend_comments", false, { _video_id: post })).status).toBe(401);
  });
  it("não permite consultar curtidas de outro usuário", async () => {
    const response = await request("trend_likes?select=user_id&user_id=eq.00000000-0000-0000-0000-000000000001", true);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
  it("limita a consulta agregada a 100 autores", async () => {
    const response = await request("rpc/read_trend_follower_counts", true, { _author_ids: Array(101).fill(session.user.id) });
    expect(response.status).toBe(400);
  });
  it("retorna contagens sem identidades dos seguidores", async () => {
    const response = await request("rpc/read_trend_follower_counts", true, { _author_ids: [session.user.id] });
    expect(response.status).toBe(200);
    for (const row of await response.json()) expect(Object.keys(row).sort()).toEqual(["author_id", "follower_count"]);
  });
});