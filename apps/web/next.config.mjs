/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pakeeza/database"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
