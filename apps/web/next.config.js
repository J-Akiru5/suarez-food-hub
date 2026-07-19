/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@repo/ui", "@repo/utils"],
  allowedDevOrigins: ['192.168.0.136'],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

module.exports = nextConfig;
