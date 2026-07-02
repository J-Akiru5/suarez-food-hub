/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@repo/ui", "@repo/utils", "@repo/types", "@repo/supabase", "@repo/utils"],
};

module.exports = nextConfig;
