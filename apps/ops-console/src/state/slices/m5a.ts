import type { StateCreator } from "zustand";
import type { M5aScreen } from "@/types/common";

export interface M5aSlice {
  m5aScreen: M5aScreen;
  setM5aScreen: (screen: M5aScreen) => void;
}

export const createM5aSlice: StateCreator<M5aSlice, [], [], M5aSlice> = (set) => ({
  m5aScreen: "readiness",

  setM5aScreen: (screen) => set({ m5aScreen: screen }),
});
