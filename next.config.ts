import type { NextConfig } from "next";

/**
 * Dev-only pages are named `page.dev.tsx` and are only treated as
 * routes outside production, so the /dev model harness is absent from
 * the production build entirely — no route, no bundle, no weight on
 * the real app.
 */
const pageExtensions =
  process.env.NODE_ENV === "production"
    ? ["tsx", "ts", "jsx", "js"]
    : ["dev.tsx", "tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  pageExtensions,
};

export default nextConfig;
