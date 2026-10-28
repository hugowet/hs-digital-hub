import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authMiddleware: {},
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
}));

// Execute the real handlers with a verified-auth context; retain the middleware
// list so regressions removing the initial identity gate also fail these tests.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const middleware: unknown[] = [];
    const builder = {
      middleware: (items: unknown[]) => { middleware.push(...items); return builder; },
      inputValidator: () => builder,
      handler: (handler: unknown) => ({ handler, middleware }),
    };
    return builder;
  },
}));
vi.mock("../integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: mocks.authMiddleware }));
vi.mock("../integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));

import { setProductShippingAdmin, setAllProductsShippingAdmin } from "./admin-shipping.functions";

type Action = {
  middleware: unknown[];
  handler: (input: {
    data: { productId: string; freeShipping: boolean };
    context: { userId: string; supabase: { auth: { getUser: typeof mocks.getUser }; rpc: typeof mocks.rpc } };
  }) => Promise<unknown>;
};
const userId = "c624eb5f-4c7e-4dae-8d92-e02983b77378";
const productId = "00000000-0000-4000-8000-000000000001";
const context = { userId, supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc } };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: mocks.eq, neq: mocks.neq });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.neq.mockResolvedValue({ error: null });
});

for (const [name, fn] of [["individual", setProductShippingAdmin], ["em massa", setAllProductsShippingAdmin]] as const) {
  describe(`frete ${name}`, () => {
    const action = fn as unknown as Action;
    const run = () => action.handler({ data: { productId, freeShipping: true }, context });

    it("requires authenticated middleware", () => {
      expect(action.middleware).toContain(mocks.authMiddleware);
    });
    it("blocks a missing live session before checking roles or updating", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
      await expect(run()).rejects.toMatchObject({ status: 401 });
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.from).not.toHaveBeenCalled();
    });
    it("blocks revoked sessions", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: new Error("revoked") });
      await expect(run()).rejects.toMatchObject({ status: 401 });
      expect(mocks.from).not.toHaveBeenCalled();
    });
    it("blocks mismatched identity", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "another-user" } }, error: null });
      await expect(run()).rejects.toMatchObject({ status: 401 });
      expect(mocks.from).not.toHaveBeenCalled();
    });
    it("returns HTTP 403 for a user without admin role and never updates", async () => {
      mocks.rpc.mockResolvedValue({ data: false, error: null });
      await expect(run()).rejects.toMatchObject({ status: 403 });
      expect(mocks.rpc).toHaveBeenCalledWith("has_role", { _user_id: userId, _role: "admin" });
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    });
    it("fails closed with HTTP 403 when the role query fails", async () => {
      mocks.rpc.mockResolvedValue({ data: true, error: new Error("query failed") });
      await expect(run()).rejects.toMatchObject({ status: 403 });
      expect(mocks.update).not.toHaveBeenCalled();
    });
    it("requires an explicitly true admin result", async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: null });
      await expect(run()).rejects.toMatchObject({ status: 403 });
      expect(mocks.update).not.toHaveBeenCalled();
    });
    it("allows updates only after validating the live user and protected admin role", async () => {
      await expect(run()).resolves.toEqual({ success: true });
      expect(mocks.getUser).toHaveBeenCalledOnce();
      expect(mocks.rpc).toHaveBeenCalledWith("has_role", { _user_id: userId, _role: "admin" });
      expect(mocks.from).toHaveBeenCalledWith("products");
      expect(mocks.update).toHaveBeenCalledWith({ free_shipping: true });
      expect(mocks.getUser.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]);
      expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
      if (name === "individual") expect(mocks.eq).toHaveBeenCalledWith("id", productId);
      else expect(mocks.neq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
    });
  });
}