import type { StateStorage } from "zustand/middleware";
import type { Trip } from "@/types";
import { toast } from "@/components/ui/toast";

let quotaWarned = false;

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        if (!quotaWarned) {
          quotaWarned = true;
          toast.error(
            "本地存储已满",
            "数据未能保存。请导出行程备份后删除不需要的行程，释放空间。"
          );
          setTimeout(() => {
            quotaWarned = false;
          }, 30_000);
        }
      } else {
        console.error("[Storage] localStorage 写入失败:", error);
      }
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Private browsing and disabled storage are safe no-op cases.
    }
  },
};

export function touchTrips(trips: Trip[], tripId: string, now = new Date().toISOString()): Trip[] {
  return trips.map((trip) => (trip.id === tripId ? { ...trip, updatedAt: now } : trip));
}
