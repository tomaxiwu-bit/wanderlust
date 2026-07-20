import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wanderlust.example.com"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  title: {
    default: "Wanderlust · 漫游规划器",
    template: "%s · Wanderlust",
  },
  description:
    "一个本地优先的旅行规划工具，帮你编排行程、管理预算、记录攻略。支持国内外旅行，地图路线、多币种预算、攻略笔记一应俱全。",
  keywords: ["旅行规划", "行程管理", "预算管理", "地图", "攻略笔记", "travel planner"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Wanderlust",
    title: "Wanderlust · 漫游规划器",
    description: "本地优先的旅行规划工具，编排行程、管理预算、记录攻略",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wanderlust · 漫游规划器",
    description: "本地优先的旅行规划工具，编排行程、管理预算、记录攻略",
  },
  robots: { index: true, follow: true },
};

// 页面初始化 inline 脚本（在 React 水合之前执行）
// 1. 防止暗黑模式 SSR 闪烁：提前把 .dark 类加到 <html> 上
// 2. 过滤 TRAE 内置浏览器环境产生的不可修复错误，保持控制台干净
// 3. 持续清理 TRAE 浏览器扩展注入的 data-trae-ref 属性，避免 hydration mismatch
//    （TRAE 扩展会在 React 水合前后给 <a>/<button> 等元素注入 data-trae-ref，
//     导致 SSR HTML 与客户端 DOM 不一致，React 报 hydration warning。
//     suppressHydrationWarning 只对直接子节点生效，不传播到后代 <a>，
//     所以用 MutationObserver 主动清理这些属性。）
const themeScript = `(function(){
try{var t=localStorage.getItem('wanderlust-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}
if(typeof window!=='undefined'&&!window.__traeErrorFilter){
window.__traeErrorFilter=true;
var oe=console.error;
console.error=function(){
try{
var a=Array.prototype.slice.call(arguments);
var f=String(a[0]||'')+String(a[1]||'');
if(f.indexOf('preload-browserView.js')!==-1)return;
if(f.indexOf('Unable to load preload script')!==-1)return;
if(f.indexOf('getThemeColors')!==-1)return;
if(f.indexOf('exportedColors')!==-1)return;
oe.apply(console,a);
}catch(e){oe.apply(console,arguments);}
};
}
// 清理 TRAE 扩展注入的 data-trae-ref 属性，避免 hydration mismatch
if(typeof window!=='undefined'&&!window.__traeAttrCleaner){
window.__traeAttrCleaner=true;
var cleanAttrs=function(){
var els=document.querySelectorAll('[data-trae-ref]');
for(var i=0;i<els.length;i++){els[i].removeAttribute('data-trae-ref');}
};
cleanAttrs();
if(typeof MutationObserver!=='undefined'){
var obs=new MutationObserver(function(muts){
for(var i=0;i<muts.length;i++){
if(muts[i].addedNodes&&muts[i].addedNodes.length>0){cleanAttrs();break;}
if(muts[i].attributeName==='data-trae-ref'){cleanAttrs();break;}
}
});
obs.observe(document.documentElement||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-trae-ref']});
}
}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Toaster />
            <ConfirmDialogProvider />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
