"use client";

import type { ReactElement } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import type { Expense, ExpenseCategory, Trip } from "@/types";

interface BudgetChartsProps {
  expenses: Expense[];
  trip: Trip;
  byCategory: Record<ExpenseCategory, number>;
}

export function BudgetCharts({ expenses, trip, byCategory }: BudgetChartsProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        暂无支出数据，记一笔后展示图表
      </div>
    );
  }

  const pieData = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[])
    .map((cat) => ({
      name: EXPENSE_CATEGORIES[cat].label,
      value: byCategory[cat] ?? 0,
      color: EXPENSE_CATEGORIES[cat].color,
    }))
    .filter((d) => d.value > 0);

  // 2. 按天汇总（柱状图数据）
  const totalDays =
    differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate)) +
    1;

  const byDay = Array.from({ length: totalDays }, (_, i) => ({
    day: `第${i + 1}天`,
    amount: 0,
  }));

  expenses
    .filter((e) => Number.isFinite(e.convertedAmount ?? e.amount))
    .forEach((e) => {
      const dayIndex = differenceInCalendarDays(
        parseISO(e.date),
        parseISO(trip.startDate)
      );
      if (dayIndex >= 0 && dayIndex < totalDays) {
        byDay[dayIndex].amount += e.convertedAmount ?? e.amount;
      }
    });

  // 过滤掉没有支出的天数（仅在有支出天数 > 7 时过滤，否则全部显示）
  const displayData =
    totalDays > 7 ? byDay.filter((d) => d.amount > 0) : byDay;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 分类饼图 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-medium">
          <PieChartIcon className="h-4 w-4 text-primary" />
          支出分类占比
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              labelLine={false}
              label={renderPieLabel}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                formatCurrency(Number(value), trip.baseCurrency)
              }
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 每日支出柱状图 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-medium">
          <BarChart3 className="h-4 w-4 text-primary" />
          每日支出趋势
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              formatter={(value) =>
                formatCurrency(Number(value), trip.baseCurrency)
              }
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            />
            <Bar
              dataKey="amount"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 饼图标签渲染：显示百分比
 * 返回 <text> 元素并显式设置 fill，使其在暗黑模式下可读
 */
function renderPieLabel(props: {
  name?: string;
  percent?: number;
  x?: number;
  y?: number;
}): ReactElement | string {
  const { name, percent, x, y } = props;
  if (!percent) return "";
  return (
    <text
      x={x}
      y={y}
      fill="var(--foreground)"
      fontSize={12}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}
