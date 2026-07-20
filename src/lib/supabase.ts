import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 开发环境友好提示：未配置 Supabase 时降级为空客户端
  console.warn(
    "[Supabase] 未检测到环境变量 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。\n" +
      "请复制 .env.local.example 为 .env.local 并填入你的 Supabase 项目凭据。\n" +
      "在此之前，账号相关功能将不可用，但本地功能可正常使用。"
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Supabase 是否已配置 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
