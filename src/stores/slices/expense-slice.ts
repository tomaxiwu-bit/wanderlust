import type { Expense } from "@/types";
import { generateId } from "@/lib/utils";
import type { ExpenseSlice, TripStoreSlice } from "@/stores/trip-store.types";
import { touchTrips } from "@/stores/trip-store.utils";

export const createExpenseSlice: TripStoreSlice<ExpenseSlice> = (set, get) => ({
  expenses: [],
  addExpense: (expense) => {
    const newExpense: Expense = { ...expense, id: generateId() };
    const now = new Date().toISOString();
    set((state) => ({
      expenses: [...state.expenses, newExpense],
      trips: touchTrips(state.trips, expense.tripId, now),
    }));
    return newExpense;
  },
  updateExpense: (id, updates) =>
    set((state) => {
      const expense = state.expenses.find((item) => item.id === id);
      return {
        expenses: state.expenses.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        trips: expense ? touchTrips(state.trips, expense.tripId) : state.trips,
      };
    }),
  deleteExpense: (id) =>
    set((state) => {
      const expense = state.expenses.find((item) => item.id === id);
      return {
        expenses: state.expenses.filter((item) => item.id !== id),
        trips: expense ? touchTrips(state.trips, expense.tripId) : state.trips,
      };
    }),
  getExpensesByTrip: (tripId) => get().expenses.filter((expense) => expense.tripId === tripId),
});
