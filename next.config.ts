import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Custom webpack configuration to avoid bundling of dynamic-require packages that break the build
  webpack: (config, { isServer }) => {
    // Only adjust the server bundle since the libraries are never executed in the browser
    if (isServer) {
      const externalsToExclude = [
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
        "clone-deep",
        "merge-deep",
        "shallow-clone",
        "is-plain-object",
        "kind-of",
        "for-own",
        "lazy-cache",
      ];

      // If externals is an array we can simply push, otherwise preserve the original value
      if (Array.isArray(config.externals)) {
        config.externals.push(...externalsToExclude);
      }
    }

    return config;
  },
};

export default nextConfig;
