import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin",
    "puppeteer-extra-plugin-stealth",
    "puppeteer-extra-plugin-user-preferences",
    "puppeteer-extra-plugin-user-data-dir",
    "fs-extra",
    "universalify",
    "graceful-fs",
    "jsonfile",
    "@tailwindcss/node",
    "@tailwindcss/postcss",
    "enhanced-resolve",
  ],

  outputFileTracingIncludes: {
    "app/api/**": [
      "./node_modules/puppeteer/**",
      "./node_modules/puppeteer-extra/**",
      "./node_modules/puppeteer-extra-plugin/**",
      "./node_modules/puppeteer-extra-plugin-stealth/**",
      "./node_modules/puppeteer-extra-plugin-user-preferences/**",
      "./node_modules/puppeteer-extra-plugin-user-data-dir/**",
      "./node_modules/fs-extra/**",
      "./node_modules/universalify/**",
      "./node_modules/graceful-fs/**",
      "./node_modules/jsonfile/**",
      "./node_modules/@tailwindcss/node/**",
      "./node_modules/@tailwindcss/postcss/**",
      "./node_modules/enhanced-resolve/**",
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin",
        "puppeteer-extra-plugin-stealth",
        "puppeteer-extra-plugin-user-preferences",
        "puppeteer-extra-plugin-user-data-dir",
        "fs-extra",
        "universalify",
        "graceful-fs",
        "jsonfile",
        "@tailwindcss/node",
        "@tailwindcss/postcss",
        "enhanced-resolve",
      ];
    }
    return config;
  },
};

export default nextConfig;
