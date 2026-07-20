"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Map,
  Compass,
  Plane,
  User,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Menu,
  X,
  Footprints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/dashboard", label: "我的行程", icon: Map },
  { href: "/explore", label: "探索", icon: Compass },
  { href: "/atlas", label: "足迹", icon: Footprints },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, configured, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Esc 键关闭所有下拉菜单
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    router.push("/");
  };

  // 头像首字母
  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md"
      suppressHydrationWarning
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* 移动端汉堡按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary md:hidden"
            aria-label="菜单"
            aria-haspopup="menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Plane className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">Wanderlust</span>
          </Link>
        </div>

        {/* 桌面端导航 + 用户区 */}
        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={theme === "dark" ? "切换到亮色" : "切换到暗色"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* 用户认证区 */}
          {configured && !user && (
            <div className="hidden items-center gap-2 pl-2 sm:flex">
              <Link
                href="/auth/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                登录
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                注册
              </Link>
            </div>
          )}

          {configured && user && (
            <div className="relative pl-2" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg p-1 transition-colors hover:bg-secondary"
                aria-label="用户菜单"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="user-menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {profile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={profile.username}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
              </button>

              {menuOpen && (
                <div
                  id="user-menu"
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-medium">
                      {profile?.username ?? "用户"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-secondary"
                  >
                    <User className="h-4 w-4" />
                    我的主页
                  </Link>
                  <button
                    onClick={handleSignOut}
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/5"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          role="menu"
          className="border-t border-border bg-card px-4 py-3 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* 移动端认证按钮 */}
            {configured && !user && (
              <div className="mt-2 flex gap-2 border-t border-border pt-3">
                <Link
                  href="/auth/login"
                  className="flex-1 rounded-lg border border-border px-3 py-2.5 text-center text-sm font-medium transition-colors hover:bg-secondary"
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
