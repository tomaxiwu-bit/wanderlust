import type { PackingItem } from "@/types";
import { generateId } from "@/lib/utils";
import type { PackingSlice, TripStoreSlice } from "@/stores/trip-store.types";
import { touchTrips } from "@/stores/trip-store.utils";

export const createPackingSlice: TripStoreSlice<PackingSlice> = (set, get) => ({
  packingItems: [],
  addPackingItem: (item) => {
    const newItem: PackingItem = { ...item, id: generateId() };
    const now = new Date().toISOString();
    set((state) => ({
      packingItems: [...state.packingItems, newItem],
      trips: touchTrips(state.trips, item.tripId, now),
    }));
    return newItem;
  },
  updatePackingItem: (id, updates) =>
    set((state) => {
      const item = state.packingItems.find((entry) => entry.id === id);
      return {
        packingItems: state.packingItems.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry
        ),
        trips: item ? touchTrips(state.trips, item.tripId) : state.trips,
      };
    }),
  deletePackingItem: (id) =>
    set((state) => {
      const item = state.packingItems.find((entry) => entry.id === id);
      return {
        packingItems: state.packingItems.filter((entry) => entry.id !== id),
        trips: item ? touchTrips(state.trips, item.tripId) : state.trips,
      };
    }),
  togglePackingItem: (id) =>
    set((state) => {
      const item = state.packingItems.find((entry) => entry.id === id);
      return {
        packingItems: state.packingItems.map((entry) =>
          entry.id === id ? { ...entry, packed: !entry.packed } : entry
        ),
        trips: item ? touchTrips(state.trips, item.tripId) : state.trips,
      };
    }),
  getPackingItemsByTrip: (tripId) =>
    get().packingItems.filter((item) => item.tripId === tripId),
  bulkAddPackingItems: (items) => {
    if (items.length === 0) return;
    const newItems: PackingItem[] = items.map((item) => ({ ...item, id: generateId() }));
    const now = new Date().toISOString();
    set((state) => ({
      packingItems: [...state.packingItems, ...newItems],
      trips: touchTrips(state.trips, items[0].tripId, now),
    }));
  },
});
