import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 项目路径包含中文字符（桌面/github项目），
  // Turbopack 生成 source map 时会报字节边界错误，
  // 因此 dev 脚本使用 --webpack 参数启动。
  // 如后续迁移到纯英文路径，可移除 package.json 中的 --webpack 参数恢复 Turbopack。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
