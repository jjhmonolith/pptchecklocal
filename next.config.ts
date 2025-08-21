import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["jsonwebtoken"],
  },
  // 파일 업로드 크기 제한 증가 (50MB)
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  serverExternalPackages: ["jsonwebtoken"],
};

export default nextConfig;
