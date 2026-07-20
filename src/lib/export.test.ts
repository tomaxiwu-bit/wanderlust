import { describe, expect, it } from "vitest";
import { parseTripBackup } from "./export";

const validBackup = {
  version: 3,
  exportedAt: "2026-07-18T00:00:00.000Z",
  trip: {
    title: "北海道之旅",
    destination: "日本 · 北海道",
    startDate: "2026-12-01",
    endDate: "2026-12-07",
    baseCurrency: "JPY",
    status: "planning",
    visibility: "friends",
    participants: ["Ada", "Lin", "Ada", ""],
  },
  places: [
    {
      _exportId: "place-1",
      name: "小樽运河",
      type: "attraction",
      dayIndex: 0,
      order: 0,
      lat: 43.1979,
      lng: 141.002,
    },
  ],
  expenses: [
    {
      _placeExportId: "place-1",
      category: "food",
      amount: 3200,
      currency: "JPY",
      date: "2026-12-01",
      paidBy: "Ada",
      splitAmong: ["Ada", "Lin"],
    },
  ],
  notes: [{ title: "预约", content: "提前订位", _placeExportId: "place-1" }],
  packingItems: [
    {
      name: "护照",
      category: "documents",
      packed: false,
      quantity: 1,
      suggested: true,
    },
  ],
};

describe("parseTripBackup", () => {
  it("preserves group metadata and validated child references", () => {
    const backup = parseTripBackup(JSON.stringify(validBackup));

    expect(backup.trip).toMatchObject({
      visibility: "friends",
      participants: ["Ada", "Lin"],
      baseCurrency: "JPY",
    });
    expect(backup.places[0]).toMatchObject({ exportId: "place-1", name: "小樽运河" });
    expect(backup.expenses[0]).toMatchObject({ placeExportId: "place-1", paidBy: "Ada" });
    expect(backup.notes[0]).toMatchObject({ placeExportId: "place-1", title: "预约" });
  });

  it("skips malformed child records but rejects a malformed trip", () => {
    const withBrokenChildren = {
      ...validBackup,
      places: [...validBackup.places, { name: "无坐标", type: "unknown", dayIndex: -1, order: 0 }],
      expenses: [...validBackup.expenses, { category: "food", amount: -1, currency: "JPY", date: "bad-date" }],
      notes: [...validBackup.notes, { title: "", content: 42 }],
      packingItems: [...validBackup.packingItems, { name: "", category: "miscellaneous", quantity: 0 }],
    };

    const backup = parseTripBackup(JSON.stringify(withBrokenChildren));
    expect(backup.places).toHaveLength(1);
    expect(backup.expenses).toHaveLength(1);
    expect(backup.notes).toHaveLength(1);
    expect(backup.packingItems).toHaveLength(1);

    expect(() => parseTripBackup(JSON.stringify({ version: 3, trip: { title: "" } }))).toThrow(
      "备份文件缺少行程名称或目的地"
    );
  });
});
