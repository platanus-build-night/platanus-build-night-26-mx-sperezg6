import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root so a stray lockfile in $HOME doesn't confuse inference.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
