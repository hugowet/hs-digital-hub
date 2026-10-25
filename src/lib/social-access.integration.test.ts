import { test, expect } from "bun:test";

const url = process.env.SOCIAL_TEST_URL;
const key = process.env.SOCIAL_TEST_KEY;
const token = process.env.SOCIAL_TEST_TOKEN;
const userId = process.env.SOCIAL_TEST_USER;

test.skipIf(!url || !key || !token || !userId)("administrador recebe acesso premium gratuito pelo papel protegido", async () => {
  const rpc = async (name: string, body: Record<string, string>) => {
    const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST", headers: { apikey: key ?? "", Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    expect(result.ok).toBe(true);
    return result.json();
  };
  expect(await rpc("has_role", { _user_id: userId ?? "", _role: "admin" })).toBe(true);
  expect(await rpc("club_has_access", { _user_id: userId ?? "" })).toBe(true);
});