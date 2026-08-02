import { describe, expect, it } from "vitest";
import type { Place } from "@/types";
import { generatePackingSuggestions } from "./packing-suggest";

function place(name: string, type: Place["type"]): Place {
  return {
    id: `place-${name}`,
    tripId: "trip-1",
    dayIndex: 0,
    name,
    type,
    order: 0,
  };
}

describe("rule-based packing suggestions", () => {
  it("combines trip length, destination, and planned activities", () => {
    const suggestions = generatePackingSuggestions(
      "三亚",
      4,
      [place("海边徒步路线", "attraction"), place("免税商场", "shopping")],
    );
    const byName = new Map(suggestions.map((item) => [item.name, item]));

    expect(byName.get("内裤")?.quantity).toBe(5);
    expect(byName.get("防晒霜")?.reason).toContain("热带海滨城市");
    expect(byName.get("登山鞋")?.reason).toBe("根据行程活动");
    expect(byName.get("折叠购物袋")?.reason).toBe("根据行程活动");
  });

  it("deduplicates recommendations and keeps the larger quantity", () => {
    const suggestions = generatePackingSuggestions("海边", 2, []);
    const sunglasses = suggestions.filter((item) => item.name === "太阳镜");

    expect(sunglasses).toHaveLength(1);
    expect(sunglasses[0].quantity).toBe(1);
  });
});
