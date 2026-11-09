import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    agentFeedback: true,
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        {key: "X-Content-Type-Options", value: "nosniff"},
        {key: "X-Frame-Options", value: "DENY"},
        {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
        {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()"},
        ...(process.env.NODE_ENV === "production"
          ? [{key: "Strict-Transport-Security", value: "max-age=31536000"}]
          : []),
      ],
    }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
