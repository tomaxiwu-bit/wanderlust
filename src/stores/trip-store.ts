import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createExpenseSlice } from "@/stores/slices/expense-slice";
import { createNoteSlice } from "@/stores/slices/note-slice";
import { createPackingSlice } from "@/stores/slices/packing-slice";
import { createPlaceSlice } from "@/stores/slices/place-slice";
import { createTripSlice } from "@/stores/slices/trip-slice";
import type { Trip } from "@/types";
import type { TripStoreState } from "@/stores/trip-store.types";
import { safeLocalStorage } from "@/stores/trip-store.utils";

export type {
  ExpenseSlice,
  NoteSlice,
  PackingSlice,
  PlaceSlice,
  TripSlice,
  TripStoreState,
} from "@/stores/trip-store.types";

/**
 * Local-first travel store composed from independent domain slices.
 * The public hook and methods are unchanged; each domain now owns its CRUD logic.
 */
export const useTripStore = create<TripStoreState>()(
  persist(
    (set, get, store) => ({
      ...createTripSlice(set, get, store),
      ...createPlaceSlice(set, get, store),
      ...createExpenseSlice(set, get, store),
      ...createNoteSlice(set, get, store),
      ...createPackingSlice(set, get, store),
    }),
    {
      name: "wanderlust-storage",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      migrate: (persistedState: unknown, version: number) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        const state = persistedState as Record<string, unknown>;
        if (version < 1 && Array.isArray(state.trips)) {
          state.trips = (state.trips as Trip[]).map((trip) => ({
            ...trip,
            baseCurrency: trip.baseCurrency ?? "CNY",
            status: trip.status ?? "planning",
            visibility: trip.visibility ?? "private",
          }));
        }
        return state;
      },
    }
  )
);
