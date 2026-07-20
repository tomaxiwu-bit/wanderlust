import type { Place } from "@/types";
import { generateId } from "@/lib/utils";
import type { PlaceSlice, TripStoreSlice } from "@/stores/trip-store.types";
import { touchTrips } from "@/stores/trip-store.utils";

export const createPlaceSlice: TripStoreSlice<PlaceSlice> = (set, get) => ({
  places: [],
  addPlace: (place) => {
    const newPlace: Place = { ...place, id: generateId() };
    const now = new Date().toISOString();
    set((state) => ({
      places: [...state.places, newPlace],
      trips: touchTrips(state.trips, place.tripId, now),
    }));
    return newPlace;
  },
  updatePlace: (id, updates) =>
    set((state) => {
      const place = state.places.find((item) => item.id === id);
      return {
        places: state.places.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        trips: place ? touchTrips(state.trips, place.tripId) : state.trips,
      };
    }),
  deletePlace: (id) =>
    set((state) => {
      const place = state.places.find((item) => item.id === id);
      return {
        places: state.places.filter((item) => item.id !== id),
        expenses: state.expenses.filter((expense) => expense.placeId !== id),
        notes: state.notes.filter((note) => note.placeId !== id),
        trips: place ? touchTrips(state.trips, place.tripId) : state.trips,
      };
    }),
  reorderPlaces: (placeIds, dayIndex) =>
    set((state) => {
      const firstPlace = state.places.find((place) => place.id === placeIds[0]);
      return {
        places: state.places.map((place) => {
          const order = placeIds.indexOf(place.id);
          return order === -1 ? place : { ...place, order, dayIndex };
        }),
        trips: firstPlace ? touchTrips(state.trips, firstPlace.tripId) : state.trips,
      };
    }),
  getPlacesByTrip: (tripId) =>
    get().places
      .filter((place) => place.tripId === tripId)
      .sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order),
  getPlacesByDay: (tripId, dayIndex) =>
    get().places
      .filter((place) => place.tripId === tripId && place.dayIndex === dayIndex)
      .sort((a, b) => a.order - b.order),
});
