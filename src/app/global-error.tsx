"use client";

/**
 * 根级错误边界（global-error）
 * 捕获 layout.tsx 级别的错误，必须自包含 <html><body>
 */

import { useEffect } from "react";
// global-error 会替换根 layout，因此 layout 中引入的全局样式不会自动生效，
// 这里重新引入 globals.css，确保主题 CSS 变量（:root / .dark）可用
import "./globals.css";

// 防止暗黑模式 SSR 闪烁的 inline 脚本（与 layout.tsx 保持一致）
// 在内容绘制前读取 localStorage 主题偏好，给 <html> 加上 .dark 类
const themeScript = `(function(){try{var t=localStorage.getItem('wanderlust-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}})()`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            应用发生严重错误
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            页面无法正常加载。请尝试刷新，如果问题持续请联系管理员。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
