"use client";

/**
 * 费用拆分面板
 *
 * 灵感来源：Splitwise 的 Simplify Debts + TREK 的费用拆分
 * - 参与者管理
 * - 每人余额概览（支付 vs 应承担）
 * - 智能结算建议（最少转账次数）
 */

import { useMemo, useState } from "react";
import type { Trip, Expense } from "@/types";
import { useTripStore } from "@/stores/trip-store";
import { calculateSplit } from "@/lib/debt-settle";
import { formatCurrency } from "@/lib/utils";
import { Button, Modal, FormField } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import {
  Users,
  Plus,
  Trash2,
  ArrowRight,
  UserPlus,
  Scale,
  CheckCircle2,
} from "lucide-react";

interface SplitExpensePanelProps {
  trip: Trip;
  expenses: Expense[];
}

export function SplitExpensePanel({ trip, expenses }: SplitExpensePanelProps) {
  const updateTrip = useTripStore((s) => s.updateTrip);
  const [showParticipants, setShowParticipants] = useState(false);

  const participants = useMemo(() => trip.participants ?? [], [trip.participants]);

  const splitResult = useMemo(
    () => calculateSplit(expenses, participants),
    [expenses, participants]
  );

  const hasParticipants = participants.length > 0;
  const hasExpensesWithPayer = expenses.some((e) => e.paidBy);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">费用拆分</h3>
            <p className="text-sm text-muted-foreground">
              {hasParticipants
                ? `${participants.length} 位参与者 · ${splitResult.settlements.length} 笔结算`
                : "添加参与者后自动计算每人应付金额"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Users className="h-4 w-4" />}
          onClick={() => setShowParticipants(true)}
        >
          管理参与者
        </Button>
      </div>

      {!hasParticipants ? (
        <div className="p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            添加旅行伙伴，自动计算费用分摊
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-3"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowParticipants(true)}
          >
            添加参与者
          </Button>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* 人均支出 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">总支出</p>
              <p className="mt-1 text-lg font-bold">
                {formatCurrency(splitResult.totalSpent, trip.baseCurrency)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">人均</p>
              <p className="mt-1 text-lg font-bold">
                {formatCurrency(splitResult.perPerson, trip.baseCurrency)}
              </p>
            </div>
          </div>

          {/* 每人余额 */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              参与者余额
            </h4>
            <div className="space-y-2">
              {splitResult.balances.map((balance) => (
                <div
                  key={balance.name}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{balance.name}</p>
                    <p className="text-xs text-muted-foreground">
                      支付 {formatCurrency(balance.totalPaid, trip.baseCurrency)} · 应担 {formatCurrency(balance.totalShare, trip.baseCurrency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        balance.netBalance > 0.01
                          ? "text-green-600"
                          : balance.netBalance < -0.01
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {balance.netBalance > 0.01
                        ? `应收 ${formatCurrency(Math.abs(balance.netBalance), trip.baseCurrency)}`
                        : balance.netBalance < -0.01
                        ? `应付 ${formatCurrency(Math.abs(balance.netBalance), trip.baseCurrency)}`
                        : "已结清"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 结算建议 */}
          {splitResult.settlements.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                结算建议（最少转账）
              </h4>
              <div className="space-y-2">
                {splitResult.settlements.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                        {s.from}
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                        {s.to}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(s.amount, trip.baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : hasExpensesWithPayer ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>所有费用已结清，无需转账</span>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              提示：在支出记录中标记「付款人」，系统将自动计算每人应付金额和最优结算方案
            </div>
          )}
        </div>
      )}

      {/* 参与者管理弹窗 */}
      {showParticipants && (
        <ParticipantsModal
          participants={participants}
          onClose={() => setShowParticipants(false)}
          onSave={(newParticipants) => {
            updateTrip(trip.id, { participants: newParticipants });
            setShowParticipants(false);
            toast.success("参与者已更新");
          }}
        />
      )}
    </div>
  );
}

/** 参与者管理弹窗 */
function ParticipantsModal({
  participants,
  onClose,
  onSave,
}: {
  participants: string[];
  onClose: () => void;
  onSave: (participants: string[]) => void;
}) {
  const [list, setList] = useState<string[]>(participants);
  const [newName, setNewName] = useState("");

  const addParticipant = () => {
    const name = newName.trim();
    if (!name) return;
    if (list.includes(name)) {
      toast.error("已存在", "该参与者已在列表中");
      return;
    }
    setList([...list, name]);
    setNewName("");
  };

  const removeParticipant = (name: string) => {
    setList(list.filter((p) => p !== name));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="管理参与者"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(list)}>保存</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 添加新参与者 */}
        <FormField label="添加参与者">
          {({ id }) => (
            <div className="flex gap-2">
              <input
                id={id}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder="输入姓名"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={addParticipant}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                添加
              </Button>
            </div>
          )}
        </FormField>

        {/* 参与者列表 */}
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            当前参与者（{list.length}）
          </p>
          {list.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              还没有添加参与者
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5"
                >
                  <span className="text-sm font-medium">{name}</span>
                  <button
                    onClick={() => removeParticipant(name)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="移除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          添加参与者后，在记一笔支出时可选择付款人和分摊人，系统将自动计算最优结算方案
        </p>
      </div>
    </Modal>
  );
}
