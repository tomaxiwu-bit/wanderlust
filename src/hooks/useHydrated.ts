import { useEffect, useState } from "react";

/**
 * Returns `false` during SSR and the client's first render,
 * then `true` after `useEffect` runs (client-only).
 *
 * Use this to gate rendering of components that depend on
 * Zustand's persist middleware, which hydrates from localStorage
 * on the client but has empty state on the server.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
