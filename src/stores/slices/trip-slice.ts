import type { Trip } from "@/types";
import { generateId } from "@/lib/utils";
import type { TripSlice, TripStoreSlice } from "@/stores/trip-store.types";

export const createTripSlice: TripStoreSlice<TripSlice> = (set, get) => ({
  trips: [],
  addTrip: (trip) => {
    const now = new Date().toISOString();
    const newTrip: Trip = { ...trip, id: generateId(), createdAt: now, updatedAt: now };
    set((state) => ({ trips: [...state.trips, newTrip] }));
    return newTrip;
  },
  updateTrip: (id, updates) =>
    set((state) => ({
      trips: state.trips.map((trip) =>
        trip.id === id ? { ...trip, ...updates, updatedAt: new Date().toISOString() } : trip
      ),
    })),
  deleteTrip: (id) =>
    set((state) => ({
      trips: state.trips.filter((trip) => trip.id !== id),
      places: state.places.filter((place) => place.tripId !== id),
      expenses: state.expenses.filter((expense) => expense.tripId !== id),
      notes: state.notes.filter((note) => note.tripId !== id),
      packingItems: state.packingItems.filter((item) => item.tripId !== id),
    })),
  getTripById: (id) => get().trips.find((trip) => trip.id === id),
  clearTripChildren: (tripId) =>
    set((state) => ({
      places: state.places.filter((place) => place.tripId !== tripId),
      expenses: state.expenses.filter((expense) => expense.tripId !== tripId),
      notes: state.notes.filter((note) => note.tripId !== tripId),
      packingItems: state.packingItems.filter((item) => item.tripId !== tripId),
    })),
});
