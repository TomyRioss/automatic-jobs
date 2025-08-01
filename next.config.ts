import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-extra",
      "puppeteer-extra-plugin-stealth",
      "puppeteer-extra-plugin-user-preferences",
      "puppeteer-extra-plugin-user-data-dir",
      "fs-extra",
      "universalify",
      "graceful-fs",
    ],
  },

  outputFileTracingIncludes: {
    "app/api/**": [
      "./node_modules/puppeteer/**",
      "./node_modules/puppeteer-extra/**",
      "./node_modules/puppeteer-extra-plugin-stealth/**",
      "./node_modules/puppeteer-extra-plugin-user-preferences/**",
      "./node_modules/puppeteer-extra-plugin-user-data-dir/**",
      "./node_modules/fs-extra/**",
      "./node_modules/universalify/**",
      "./node_modules/graceful-fs/**",
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
        "puppeteer-extra-plugin-user-preferences",
        "puppeteer-extra-plugin-user-data-dir",
        "fs-extra",
        "universalify",
        "graceful-fs",
      ];
    }
    return config;
  },
};

export default nextConfig;
