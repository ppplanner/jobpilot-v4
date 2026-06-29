import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 消除 lockfile 警告 - 指定根目录为 frontend/
  turbopack: {
    root: __dirname,
  },
  // API 代理：把 /api/* 请求转发到后端，解决局域网跨域问题
  // 同学访问 http://192.168.x.x:3000 时，API 请求自动转发到同一台机器的后端
  // /api/* 请求由 app/api/[...path]/route.ts 统一代理处理
  // 不使用 rewrites，因为 rewrites 对外部 URL 是重定向（不是代理），
  // 且优先级高于 App Router 路由，会导致代理路由永远不被触发
};

export default nextConfig;
