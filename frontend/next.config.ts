import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'bbc3f868710f6e.lhr.life',
    'ace-mailto-covers-toolbox.trycloudflare.com',
    '192.168.1.5',
    'localhost'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ]
  },
};

export default nextConfig;
