import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const githubPages = process.env.GITHUB_PAGES === "true";
const pagesBase = process.env.PAGES_BASE_PATH || "/littlemo";

const nextConfig: NextConfig = githubPages
  ? {
      output: "export",
      basePath: pagesBase,
      assetPrefix: pagesBase,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      output: "standalone",
      transpilePackages: ["@littlemo/db"],
      serverExternalPackages: ["@prisma/client"],
      async headers() {
        return [
          { source: "/:path*", headers: securityHeaders },
          {
            source: "/api/:path*",
            headers: [{ key: "Cache-Control", value: "no-store" }],
          },
        ];
      },
    };

export default nextConfig;
