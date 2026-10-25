import { test } from "node:test";
import assert from "node:assert/strict";

const url = process.env.SOCIAL_TEST_URL;
const key = process.env.SOCIAL_TEST_KEY;
const token = process.env.SOCIAL_TEST_TOKEN;
const userId = process.env.SOCIAL_TEST_USER;

test("administrador recebe acesso premium gratuito pelo papel protegido", { skip: !url || !key || !token || !userId }, async () => {
  const rpc = async (name: string, body: Record<string, string>) => {
    const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST", headers: { apikey: key ?? "", Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(result.ok, true);
    return result.json();
  };
  assert.equal(await rpc("has_role", { _user_id: userId ?? "", _role: "admin" }), true);
  assert.equal(await rpc("club_has_access", { _user_id: userId ?? "" }), true);
});