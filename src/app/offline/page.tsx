import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export const metadata = {
  title: "当前离线",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-secondary p-4 text-primary">
        <CloudOff className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">当前处于离线状态</h1>
      <p className="mt-3 text-muted-foreground">
        已打开过的页面和保存在此设备上的行程仍可使用。恢复网络后可继续同步和浏览新内容。
      </p>
      <Link
        href="/dashboard"
        className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        返回我的行程
      </Link>
    </section>
  );
}
