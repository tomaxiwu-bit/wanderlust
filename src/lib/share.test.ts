import { describe, expect, it } from "vitest";
import { decodeTripFromShare, encodeTripToShare } from "./share";

describe("share links", () => {
  it("round-trips Chinese text and group-expense metadata", () => {
    const encoded = encodeTripToShare({
      trip: {
        id: "trip-1",
        userId: "user-1",
        title: "京都赏枫",
        destination: "日本 · 京都",
        startDate: "2026-11-12",
        endDate: "2026-11-16",
        baseCurrency: "JPY",
        status: "planning",
        visibility: "private",
        participants: ["小林", "Ada"],
        createdAt: "2026-07-18T00:00:00.000Z",
        updatedAt: "2026-07-18T00:00:00.000Z",
      },
      places: [
        {
          id: "place-1",
          tripId: "trip-1",
          name: "清水寺",
          type: "attraction",
          dayIndex: 0,
          order: 0,
          lat: 34.9949,
          lng: 135.785,
        },
      ],
      expenses: [
        {
          id: "expense-1",
          tripId: "trip-1",
          category: "food",
          amount: 3000,
          currency: "JPY",
          date: "2026-11-12",
          paidBy: "Ada",
          splitAmong: ["小林", "Ada"],
        },
      ],
      notes: [],
    });

    const decoded = decodeTripFromShare(encoded);

    expect(decoded?.trip.participants).toEqual(["小林", "Ada"]);
    expect(decoded?.places[0]).toMatchObject({ name: "清水寺", lat: 34.9949 });
    expect(decoded?.expenses[0]).toMatchObject({ paidBy: "Ada", splitAmong: ["小林", "Ada"] });
  });

  it("rejects malformed data instead of returning a partially trusted trip", () => {
    expect(decodeTripFromShare("not-valid-base64")).toBeNull();
  });
});
