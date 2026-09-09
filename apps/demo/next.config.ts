import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  async headers() {
    return ["/research.html", "/quality.html"].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
    }));
  },
};

export default nextConfig;
