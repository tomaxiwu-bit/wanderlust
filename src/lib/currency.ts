/**
 * 汇率换算服务
 * 使用 open.er-api.com 免费接口（无需 API Key，每月 1500 次免费）
 * 文档：https://www.exchangerate-api.com/docs/free-api
 */

const API_BASE = "https://open.er-api.com/v6";

// 缓存：避免重复请求 { [baseCurrency]: { rates, timestamp } }
const rateCache = new Map<
  string,
  { rates: Record<string, number>; timestamp: number }
>();

// 缓存有效期：1 小时
const CACHE_TTL = 60 * 60 * 1000;

/**
 * 获取指定基准货币的汇率表
 * 返回 { CNY: 7.19, USD: 1, JPY: 149.5, ... }
 */
export async function fetchExchangeRates(
  baseCurrency: string
): Promise<Record<string, number>> {
  // 检查缓存
  const cached = rateCache.get(baseCurrency);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rates;
  }

  const url = `${API_BASE}/latest/${baseCurrency}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      throw new Error(`获取汇率失败: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.result !== "success") {
      throw new Error(`汇率 API 返回错误: ${data["error-type"] ?? "unknown"}`);
    }

    if (!data.rates || typeof data.rates !== "object") {
      throw new Error("汇率 API 返回数据格式异常");
    }

    const rates = data.rates as Record<string, number>;

    // 写入缓存
    rateCache.set(baseCurrency, {
      rates,
      timestamp: Date.now(),
    });

    return rates;
  } catch (err) {
    // If we have cached rates (even expired), return them as fallback
    const cached = rateCache.get(baseCurrency);
    if (cached) return cached.rates;
    throw err;
  }
}

/**
 * 将金额从一种货币换算为另一种货币
 * @param amount 原始金额
 * @param fromCurrency 原始货币代码，如 USD
 * @param toCurrency 目标货币代码，如 CNY
 * @returns 换算后的金额
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const rates = await fetchExchangeRates(fromCurrency);
  const rate = rates[toCurrency];

  if (rate == null) {
    throw new Error(`不支持 ${fromCurrency} → ${toCurrency} 的汇率换算`);
  }

  return amount * rate;
}

/**
 * 批量换算（一次 API 调用换算多种货币）
 * @param items 原始金额列表
 * @param baseCurrency 统一换算到的目标货币
 * @returns 换算后的金额列表
 */
export async function batchConvert(
  items: { amount: number; currency: string }[],
  baseCurrency: string
): Promise<number[]> {
  if (items.length === 0) return [];

  // 收集所有涉及的原始货币（去重）
  const currencies = Array.from(
    new Set(items.map((i) => i.currency).filter((c) => c !== baseCurrency))
  );

  // 批量获取汇率（每种原始货币 → 目标货币）
  const rateMap: Record<string, Record<string, number>> = {};
  for (const currency of currencies) {
    try {
      rateMap[currency] = await fetchExchangeRates(currency);
    } catch (err) {
      console.error(`获取 ${currency} 汇率失败:`, err);
    }
  }

  // 换算每一笔
  return items.map((item) => {
    if (item.currency === baseCurrency) return item.amount;
    const rates = rateMap[item.currency];
    const rate = rates?.[baseCurrency];
    if (rate == null) {
      // 换算失败，回退到原始金额
      console.warn(`${item.currency} → ${baseCurrency} 汇率缺失，使用原始金额`);
      return item.amount;
    }
    return item.amount * rate;
  });
}
