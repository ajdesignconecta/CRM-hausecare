/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  onDemandEntries: {
    // Reduce chunk disposal churn in dev on Windows.
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid intermittent cache corruption on Windows during fast refresh.
      config.cache = false;
    }
    return config;
  }
};

export default nextConfig;
