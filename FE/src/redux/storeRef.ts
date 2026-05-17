import type { Store } from "@reduxjs/toolkit";
import type { RootState } from "./store";

let storeRef: Store<RootState> | undefined;

export const setStore = (store: Store<RootState>) => {
  storeRef = store;
};

export const getStore = (): Store<RootState> => {
  if (!storeRef) {
    throw new Error("Store has not been initialized");
  }
  return storeRef;
};