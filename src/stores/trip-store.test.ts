import { beforeEach, describe, expect, it } from "vitest";
import { useTripStore } from "./trip-store";

describe("trip store domain slices", () => {
  beforeEach(() => {
    useTripStore.setState({
      trips: [],
      places: [],
      expenses: [],
      notes: [],
      packingItems: [],
    });
  });

  it("keeps cross-domain cleanup behavior after composing slices", () => {
    const store = useTripStore.getState();
    const trip = store.addTrip({
      userId: "local",
      title: "东京周末",
      destination: "日本 · 东京",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      status: "planning",
      visibility: "private",
      baseCurrency: "JPY",
    });
    const place = store.addPlace({
      tripId: trip.id,
      name: "浅草寺",
      type: "attraction",
      dayIndex: 0,
      order: 0,
    });
    store.addExpense({
      tripId: trip.id,
      placeId: place.id,
      category: "ticket",
      amount: 500,
      currency: "JPY",
      date: "2026-08-01",
    });
    store.addNote({ tripId: trip.id, placeId: place.id, title: "开放时间", content: "09:00" });
    store.addPackingItem({
      tripId: trip.id,
      name: "护照",
      category: "documents",
      packed: false,
      quantity: 1,
      suggested: false,
    });

    useTripStore.getState().deletePlace(place.id);
    expect(useTripStore.getState()).toMatchObject({ places: [], expenses: [], notes: [] });
    expect(useTripStore.getState().packingItems).toHaveLength(1);

    useTripStore.getState().deleteTrip(trip.id);
    expect(useTripStore.getState()).toMatchObject({
      trips: [],
      places: [],
      expenses: [],
      notes: [],
      packingItems: [],
    });
  });
});
