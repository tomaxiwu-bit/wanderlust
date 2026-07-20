import type { Note } from "@/types";
import { generateId } from "@/lib/utils";
import type { NoteSlice, TripStoreSlice } from "@/stores/trip-store.types";
import { touchTrips } from "@/stores/trip-store.utils";

export const createNoteSlice: TripStoreSlice<NoteSlice> = (set, get) => ({
  notes: [],
  addNote: (note) => {
    const now = new Date().toISOString();
    const newNote: Note = { ...note, id: generateId(), createdAt: now, updatedAt: now };
    set((state) => ({
      notes: [...state.notes, newNote],
      trips: touchTrips(state.trips, note.tripId, now),
    }));
    return newNote;
  },
  updateNote: (id, updates) =>
    set((state) => {
      const note = state.notes.find((item) => item.id === id);
      return {
        notes: state.notes.map((item) =>
          item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
        ),
        trips: note ? touchTrips(state.trips, note.tripId) : state.trips,
      };
    }),
  deleteNote: (id) =>
    set((state) => {
      const note = state.notes.find((item) => item.id === id);
      return {
        notes: state.notes.filter((item) => item.id !== id),
        trips: note ? touchTrips(state.trips, note.tripId) : state.trips,
      };
    }),
  getNotesByTrip: (tripId) => get().notes.filter((note) => note.tripId === tripId),
});
