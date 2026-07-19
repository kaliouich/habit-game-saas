import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Image Docker minimale (PLAN.md §9)
  output: "standalone",
  // Le repo parent contient aussi un lockfile (worktree) — fixe la racine de tracing
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
