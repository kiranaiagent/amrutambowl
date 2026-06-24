// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function bumpBuildNumber() {
  return {
    name: "amrutam-build-bumper",
    apply: "build" as const,
    buildStart() {
      try {
        const p = resolve(process.cwd(), "src/build-info.json");
        const raw = JSON.parse(readFileSync(p, "utf-8")) as { build: number };
        const next = { build: (raw.build || 0) + 1, builtAt: new Date().toISOString() };
        writeFileSync(p, JSON.stringify(next, null, 2) + "\n");
      } catch {
        // ignore — first build will create it
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [bumpBuildNumber()],
  },
});
