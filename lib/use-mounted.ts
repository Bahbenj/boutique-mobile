"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true uniquement côté client, après hydratation (portails, localStorage). */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
