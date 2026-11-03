import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // The browser bundle is a global script without exports; use the bundled CJS parser.
        "@acemir/cssom": "@acemir/cssom/lib/index.js",
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
