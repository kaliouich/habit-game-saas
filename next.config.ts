import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Image Docker minimale (PLAN.md §9)
  output: "standalone",
  // Le repo parent contient aussi un lockfile (worktree) — fixe la racine de tracing
  outputFileTracingRoot: path.join(__dirname),
};

export default withSentryConfig(nextConfig, {
  // Sentry source map upload — no-op when SENTRY_AUTH_TOKEN is absent
  silent: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
