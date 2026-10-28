// Avoid the application RPC transform: test the actual server handlers.
export default {
  test: {
    include: ["src/lib/admin-shipping.functions.test.ts"],
    environment: "node",
  },
};