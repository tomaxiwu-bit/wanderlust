import { describe, expect, it } from "vitest";
import { generateItinerary, parseIntent, suggestPlaceName } from "./ai-planner";

describe("rule-based itinerary generator", () => {
  it("extracts a destination, bounded duration, and multiple preferences", () => {
    expect(parseIntent("想去成都玩三天，主要看历史文化和吃美食")).toEqual({
      destination: "成都",
      days: 3,
      preferences: ["文化历史", "美食"],
      rawInput: "想去成都玩三天，主要看历史文化和吃美食",
    });

    expect(parseIntent("去上海旅行99天").days).toBe(30);
  });

  it("matches a curated template while preserving the requested duration", () => {
    const result = generateItinerary("成都三天美食之旅");

    expect(result).toMatchObject({
      destination: "成都",
      days: 3,
      matchedTemplateId: "seed-chengdu-3d",
      confidence: 0.95,
      tags: ["美食"],
    });
    expect(result.dailyThemes).toHaveLength(3);
    expect(result.dailyPlaceTypes).toHaveLength(3);
  });

  it("falls back deterministically for unknown destinations and place names", () => {
    const result = generateItinerary("周末安排两天摄影行程");

    expect(result.destination).toBe("待定");
    expect(result.days).toBe(2);
    expect(result.confidence).toBe(0);
    expect(suggestPlaceName("restaurant", 1)).toBe("网红美食店");
  });
});
