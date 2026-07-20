import type { StateCreator } from "zustand";
import type { Expense, Note, PackingItem, Place, Trip } from "@/types";

export interface TripSlice {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => Trip;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  getTripById: (id: string) => Trip | undefined;
  clearTripChildren: (tripId: string) => void;
}

export interface PlaceSlice {
  places: Place[];
  addPlace: (place: Omit<Place, "id">) => Place;
  updatePlace: (id: string, updates: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  reorderPlaces: (placeIds: string[], dayIndex: number) => void;
  getPlacesByTrip: (tripId: string) => Place[];
  getPlacesByDay: (tripId: string, dayIndex: number) => Place[];
}

export interface ExpenseSlice {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByTrip: (tripId: string) => Expense[];
}

export interface NoteSlice {
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getNotesByTrip: (tripId: string) => Note[];
}

export interface PackingSlice {
  packingItems: PackingItem[];
  addPackingItem: (item: Omit<PackingItem, "id">) => PackingItem;
  updatePackingItem: (id: string, updates: Partial<PackingItem>) => void;
  deletePackingItem: (id: string) => void;
  togglePackingItem: (id: string) => void;
  getPackingItemsByTrip: (tripId: string) => PackingItem[];
  bulkAddPackingItems: (items: Omit<PackingItem, "id">[]) => void;
}

export type TripStoreState = TripSlice & PlaceSlice & ExpenseSlice & NoteSlice & PackingSlice;
export type TripStoreSlice<T> = StateCreator<TripStoreState, [], [], T>;
