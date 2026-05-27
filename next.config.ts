import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-78b5971f-be92-40bc-ad55-19bb7e72bb1f.space-z.ai',
  ],
};

export default nextConfig;
