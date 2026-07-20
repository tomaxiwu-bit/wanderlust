/**
 * Supabase 未配置提示卡片
 *
 * 在登录/注册/个人主页等需要后端功能但 Supabase 未配置时展示。
 * 支持自定义描述文案和外部 className（控制外边距等）。
 */
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_DESCRIPTION = (
  <>
    复制{" "}
    <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
      .env.local.example
    </code>{" "}
    为{" "}
    <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
      .env.local
    </code>{" "}
    并填入 Supabase 凭据以启用账号功能。
  </>
);

export function SupabaseNotConfiguredNotice({
  description = DEFAULT_DESCRIPTION,
  className,
  iconSize = "h-4 w-4",
}: {
  description?: React.ReactNode;
  className?: string;
  iconSize?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Settings
          className={cn("mt-0.5 shrink-0 text-amber-600", iconSize)}
        />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Supabase 未配置</p>
          <p className="mt-1 text-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}
