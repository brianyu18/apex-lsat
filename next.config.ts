import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // Lessons and school data are read from disk at request time; ship them with every server function.
  outputFileTracingIncludes: { "/**": ["./content/lessons/**/*", "./content/schools/**/*"] },
};

export default nextConfig;
