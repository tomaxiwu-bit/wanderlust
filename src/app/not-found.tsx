/**
 * 全局 404 页面
 */

import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Compass className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold">迷路了</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        你访问的页面不存在，可能已被移除或链接有误。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        返回首页
      </Link>
    </div>
  );
}
