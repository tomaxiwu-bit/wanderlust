"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useTripStore } from "@/stores/trip-store";
import { EXPENSE_CATEGORIES, CURRENCIES, getExpenseCategoryConfig } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { convertCurrency } from "@/lib/currency";
import { Plus, Trash2, Wallet, Loader2 } from "lucide-react";
import { compareDesc, parseISO } from "date-fns";
import { Modal, FormField, Button, confirm, EmptyState } from "@/components/ui";
import { SplitExpensePanel } from "@/components/budget/SplitExpensePanel";
import type { ExpenseCategory } from "@/types";

const BudgetCharts = dynamic(
  () => import("@/components/budget/BudgetCharts").then((m) => m.BudgetCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-xl border border-border bg-secondary/30" />
    ),
  }
);

export default function BudgetPage() {
  const params = useParams<{ tripId: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === params.tripId));
  const allExpenses = useTripStore((s) => s.expenses);
  const expenses = useMemo(
    () => allExpenses.filter((e) => e.tripId === params.tripId),
    [allExpenses, params.tripId]
  );
  const addExpense = useTripStore((s) => s.addExpense);
  const deleteExpense = useTripStore((s) => s.deleteExpense);
  const updateExpense = useTripStore((s) => s.updateExpense);

  const [showForm, setShowForm] = useState(false);
  const [converting, setConverting] = useState(false);

  if (!trip) return null;

  const totalSpent = expenses.reduce(
    (sum, e) => sum + (e.convertedAmount ?? e.amount),
    0
  );

  // 按分类统计
  const byCategory = expenses.reduce(
    (acc, e) => {
      const cat = e.category as ExpenseCategory;
      const amount = e.convertedAmount ?? e.amount;
      acc[cat] = (acc[cat] ?? 0) + amount;
      return acc;
    },
    {} as Record<ExpenseCategory, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">预算管理</h2>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowForm(true)}
        >
          记一笔
        </Button>
      </div>

      {/* 总览 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">总花费</p>
          <p className="mt-1 text-2xl font-bold">
            {formatCurrency(totalSpent, trip.baseCurrency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">预算上限</p>
          <p className="mt-1 text-2xl font-bold">
            {trip.budgetLimit
              ? formatCurrency(trip.budgetLimit, trip.baseCurrency)
              : "未设置"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">剩余预算</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              trip.budgetLimit && totalSpent > trip.budgetLimit
                ? "text-destructive"
                : ""
            }`}
          >
            {trip.budgetLimit
              ? formatCurrency(trip.budgetLimit - totalSpent, trip.baseCurrency)
              : "—"}
          </p>
        </div>
      </div>

      {/* 图表可视化 */}
      <BudgetCharts expenses={expenses} trip={trip} byCategory={byCategory} />

      {/* 费用拆分（学习 Splitwise + TREK） */}
      <SplitExpensePanel trip={trip} expenses={expenses} />

      {/* 分类统计 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-medium">分类统计</h3>
        <div className="space-y-3">
          {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map(
            (cat) => {
              const config = EXPENSE_CATEGORIES[cat];
              const amount = byCategory[cat] ?? 0;
              const percent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-16 text-sm">{config.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm text-muted-foreground">
                    {formatCurrency(amount, trip.baseCurrency)}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* 支出明细 */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-medium">支出明细</h3>
        </div>
        {expenses.length === 0 ? (
          <EmptyState icon={<Wallet className="h-12 w-12" />} title="还没有支出记录" description="点击「记一笔」开始记录你的旅行花费" />
        ) : (
          <div className="divide-y divide-border">
            {expenses
              .sort((a, b) =>
                compareDesc(parseISO(a.date), parseISO(b.date))
              )
              .map((expense) => {
                const config =
                  getExpenseCategoryConfig(expense.category);
                return (
                  <div
                    key={expense.id}
                    className="group flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-2"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Wallet
                          className="h-4 w-4"
                          style={{ color: config.color }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">
                          {expense.description || config.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(expense.date, "short")} · {config.label}
                          {expense.currency !== trip.baseCurrency &&
                            ` · ${expense.currency}`}
                          {expense.paidBy && ` · ${expense.paidBy} 支付`}
                          {expense.splitAmong && expense.splitAmong.length > 0 &&
                            ` · ${expense.splitAmong.length}人分摊`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-medium">
                          {formatCurrency(
                            expense.convertedAmount ?? expense.amount,
                            trip.baseCurrency
                          )}
                        </span>
                        {expense.currency !== trip.baseCurrency && (
                          <p className="text-xs text-muted-foreground">
                            原始: {formatCurrency(expense.amount, expense.currency)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "删除此支出记录？",
                            description: "此操作不可撤销。",
                            confirmText: "删除",
                            variant: "danger",
                          });
                          if (ok) deleteExpense(expense.id);
                        }}
                        className="rounded p-2 text-muted-foreground opacity-100 transition-opacity hover:text-destructive group-hover:opacity-100 sm:opacity-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 记账弹窗 */}
      {showForm && (
        <ExpenseForm
          tripId={trip.id}
          baseCurrency={trip.baseCurrency}
          participants={trip.participants ?? []}
          onClose={() => setShowForm(false)}
          onSubmit={async (data) => {
            // 先创建记录（同币种直接存，异币种先占位）
            const newExpense = addExpense({
              ...data,
              convertedAmount:
                data.currency === trip.baseCurrency ? data.amount : undefined,
            });
            setShowForm(false);

            // 异币种：异步获取汇率并更新
            if (data.currency !== trip.baseCurrency) {
              setConverting(true);
              try {
                const converted = await convertCurrency(
                  data.amount,
                  data.currency,
                  trip.baseCurrency
                );
                updateExpense(newExpense.id, { convertedAmount: converted });
              } catch (err) {
                console.error("汇率换算失败:", err);
                // 失败时不更新 convertedAmount，显示时回退到原始金额
              } finally {
                setConverting(false);
              }
            }
          }}
        />
      )}

      {/* 汇率换算中提示 */}
      {converting && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          正在获取实时汇率...
        </div>
      )}
    </div>
  );
}

function ExpenseForm({
  tripId,
  baseCurrency,
  participants,
  onClose,
  onSubmit,
}: {
  tripId: string;
  baseCurrency: string;
  participants: string[];
  onClose: () => void;
  onSubmit: (data: {
    tripId: string;
    category: ExpenseCategory;
    amount: number;
    currency: string;
    date: string;
    description?: string;
    paidBy?: string;
    splitAmong?: string[];
  }) => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<string>(participants[0] ?? "");
  // 默认所有参与者分摊
  const [splitAmong, setSplitAmong] = useState<string[]>([...participants]);

  const hasParticipants = participants.length > 0;

  const toggleSplit = (name: string) => {
    setSplitAmong((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) return;
    onSubmit({
      tripId,
      category,
      amount: parsedAmount,
      currency,
      date,
      description,
      paidBy: hasParticipants && paidBy ? paidBy : undefined,
      splitAmong: hasParticipants && splitAmong.length > 0 ? splitAmong : undefined,
    });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="记一笔支出"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" type="submit" form="expense-form">
            添加
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="分类">
          {() => (
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      category === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {EXPENSE_CATEGORIES[cat].label}
                  </button>
                )
              )}
            </div>
          )}
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FormField label="金额" required>
              {({ id }) => (
                <input
                  id={id}
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              )}
            </FormField>
          </div>
          <div>
            <FormField label="货币">
              {({ id }) => (
                <select
                  id={id}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
        </div>
        <FormField label="日期" required>
          {({ id }) => (
            <input
              id={id}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
          )}
        </FormField>
        <FormField label="备注">
          {({ id }) => (
            <input
              id={id}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="支出说明（可选）"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </FormField>

        {/* 费用拆分：仅当行程有参与者时显示 */}
        {hasParticipants && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              费用拆分（用于多人分账）
            </p>
            <FormField label="付款人">
              {({ id }) => (
                <select
                  id={id}
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">未指定</option>
                  {participants.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="分摊人（可多选）">
              {() => (
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((p) => {
                    const checked = splitAmong.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleSplit(p)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {checked ? "✓ " : ""}
                        {p}
                      </button>
                    );
                  })}
                  {splitAmong.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      未选择时默认所有参与者均摊
                    </span>
                  )}
                </div>
              )}
            </FormField>
            {paidBy && splitAmong.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {paidBy} 支付 {formatCurrencyPreview(amount, currency)}，
                {splitAmong.length} 人均摊每人约{" "}
                {formatCurrencyPreview(
                  (parseFloat(amount || "0") / splitAmong.length).toString(),
                  currency
                )}
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

/** 金额预览（避免表单空值时报错） */
function formatCurrencyPreview(amountStr: string, currency: string): string {
  const n = parseFloat(amountStr);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
