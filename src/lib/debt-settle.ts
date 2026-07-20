/**
 * 费用拆分与债务结算算法
 *
 * 灵感来源：Splitwise 的 Simplify Debts 算法 + TREK 的费用拆分功能
 *
 * 核心算法：
 * 1. 计算每个人的净余额（付了多少 - 欠了多少）
 * 2. 将人分为债权方（正余额）和债务方（负余额）
 * 3. 贪心匹配最大债务方与最大债权方，直到所有余额归零
 *
 * 这样可以用最少的转账次数结清所有债务
 */

import type { Expense } from "@/types";

/** 个人余额 */
export interface PersonBalance {
  name: string;
  /** 总共支付了多少 */
  totalPaid: number;
  /** 总共应该承担多少 */
  totalShare: number;
  /** 净余额 = totalPaid - totalShare，正数表示应收，负数表示应付 */
  netBalance: number;
}

/** 结算建议（一笔转账） */
export interface Settlement {
  /** 付款人 */
  from: string;
  /** 收款人 */
  to: string;
  /** 金额 */
  amount: number;
}

/** 拆分结果 */
export interface SplitResult {
  /** 每个人的余额 */
  balances: PersonBalance[];
  /** 结算建议列表 */
  settlements: Settlement[];
  /** 总支出 */
  totalSpent: number;
  /** 人均支出 */
  perPerson: number;
}

/**
 * 计算费用拆分和结算建议
 *
 * @param expenses 支出列表（需含 paidBy 和 splitAmong 字段）
 * @param participants 所有参与者名单
 */
export function calculateSplit(
  expenses: Expense[],
  participants: string[]
): SplitResult {
  if (participants.length === 0) {
    return { balances: [], settlements: [], totalSpent: 0, perPerson: 0 };
  }

  // 初始化每个人的支付和分摊
  const paidMap = new Map<string, number>();
  const shareMap = new Map<string, number>();

  for (const p of participants) {
    paidMap.set(p, 0);
    shareMap.set(p, 0);
  }

  let totalSpent = 0;

  for (const expense of expenses) {
    // 使用换算后的金额，如果没有则用原始金额
    const amount = expense.convertedAmount ?? expense.amount;
    totalSpent += amount;

    // 记录付款人
    if (expense.paidBy && paidMap.has(expense.paidBy)) {
      paidMap.set(expense.paidBy, (paidMap.get(expense.paidBy) ?? 0) + amount);
    }

    // 计算分摊人列表
    const splitAmong =
      expense.splitAmong && expense.splitAmong.length > 0
        ? expense.splitAmong.filter((p) => shareMap.has(p))
        : participants;

    if (splitAmong.length === 0) continue;

    // 均摊
    const perHead = amount / splitAmong.length;
    for (const person of splitAmong) {
      shareMap.set(person, (shareMap.get(person) ?? 0) + perHead);
    }
  }

  // 计算净余额
  const balances: PersonBalance[] = participants.map((name) => {
    const totalPaid = paidMap.get(name) ?? 0;
    const totalShare = shareMap.get(name) ?? 0;
    return {
      name,
      totalPaid,
      totalShare,
      netBalance: totalPaid - totalShare,
    };
  });

  // Simplify Debts 算法
  const settlements = simplifyDebts(balances);

  return {
    balances,
    settlements,
    totalSpent,
    perPerson: totalSpent / participants.length,
  };
}

/**
 * Simplify Debts 核心算法
 *
 * 贪心策略：每次将最大债务方欠最大债权方，
 * 直到所有余额归零。产生最少的转账次数。
 */
function simplifyDebts(balances: PersonBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // 复制余额，避免修改原数据
  // 使用整数运算避免浮点误差（乘以100转为分）
  const debts = balances.map((b) => ({
    name: b.name,
    balance: Math.round(b.netBalance * 100), // 转为分
  }));

  // 分离债权方和债务方
  const creditors = debts.filter((d) => d.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = debts.filter((d) => d.balance < 0).sort((a, b) => a.balance - b.balance);

  let ci = 0; // creditor index
  let di = 0; // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    // 结算金额 = min(债权方应收, 债务方应付)
    const settleAmount = Math.min(creditor.balance, -debtor.balance);

    if (settleAmount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmount / 100, // 转回元
      });
    }

    creditor.balance -= settleAmount;
    debtor.balance += settleAmount;

    // 移动指针
    if (creditor.balance <= 0) ci++;
    if (debtor.balance >= 0) di++;
  }

  return settlements;
}

/**
 * 格式化结算建议为可读文本
 */
export function formatSettlement(settlement: Settlement): string {
  return `${settlement.from} → ${settlement.to}: ¥${settlement.amount.toFixed(2)}`;
}
