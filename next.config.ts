import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-extra",
      "puppeteer-extra-plugin-stealth",
      "puppeteer-extra-plugin-user-preferences", // 👈 nuevo
    ],
  },

  outputFileTracingIncludes: {
    "app/api/**": [
      "./node_modules/puppeteer/**",
      "./node_modules/puppeteer-extra/**",
      "./node_modules/puppeteer-extra-plugin-stealth/**",
      "./node_modules/puppeteer-extra-plugin-user-preferences/**", // 👈 nuevo
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
        "puppeteer-extra-plugin-user-preferences", // 👈 nuevo
      ];
    }
    return config;
  },
};

export default nextConfig;
