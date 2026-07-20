import { describe, expect, it } from "vitest";
import { calculateSplit, formatSettlement } from "./debt-settle";
import type { Expense } from "@/types";

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "expense-1",
    tripId: "trip-1",
    category: "food",
    amount: 0,
    currency: "CNY",
    date: "2026-07-18",
    ...overrides,
  };
}

describe("calculateSplit", () => {
  it("creates the minimum settlement transfers for an equally shared bill", () => {
    const result = calculateSplit(
      [
        expense({
          amount: 90,
          paidBy: "Ada",
          splitAmong: ["Ada", "Lin", "Mei"],
        }),
      ],
      ["Ada", "Lin", "Mei"]
    );

    expect(result.totalSpent).toBe(90);
    expect(result.perPerson).toBe(30);
    expect(result.balances).toMatchObject([
      { name: "Ada", totalPaid: 90, totalShare: 30, netBalance: 60 },
      { name: "Lin", totalPaid: 0, totalShare: 30, netBalance: -30 },
      { name: "Mei", totalPaid: 0, totalShare: 30, netBalance: -30 },
    ]);
    expect(result.settlements).toEqual([
      { from: "Lin", to: "Ada", amount: 30 },
      { from: "Mei", to: "Ada", amount: 30 },
    ]);
  });

  it("uses a converted amount and excludes people outside the trip", () => {
    const result = calculateSplit(
      [
        expense({
          amount: 20,
          convertedAmount: 144,
          paidBy: "Ada",
          splitAmong: ["Ada", "Lin", "Unknown"],
        }),
      ],
      ["Ada", "Lin"]
    );

    expect(result.totalSpent).toBe(144);
    expect(result.perPerson).toBe(72);
    expect(result.settlements).toEqual([{ from: "Lin", to: "Ada", amount: 72 }]);
    expect(formatSettlement(result.settlements[0])).toBe("Lin → Ada: ¥72.00");
  });
});
