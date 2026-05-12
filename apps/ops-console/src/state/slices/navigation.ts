import type { StateCreator } from "zustand";
import type { ModuleId, CrossModuleNavRequest, M2Screen, NavIntent, M5aScreen } from "@/types/common";

// Forward reference to the full AppStore shape.
// The actual AppStore type is defined in state/store.ts; we declare a minimal
// interface here so the slice can call `set` with fields owned by other slices.
export interface AppStoreNavShape {
  // Navigation slice fields
  activeModule: ModuleId;
  // M2 slice fields (set atomically by navigateTo)
  m2Screen: M2Screen;
  m2Intent: NavIntent | undefined;
  // M5a slice fields (set atomically by navigateTo)
  m5aScreen: M5aScreen;
}

export interface NavigationSlice {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
  navigateTo: (request: CrossModuleNavRequest) => void;
}

export const createNavigationSlice: StateCreator<
  AppStoreNavShape,
  [],
  [],
  NavigationSlice
> = (set) => ({
  activeModule: "m5a",

  setActiveModule: (id) => set({ activeModule: id }),

  navigateTo: (request) => {
    switch (request.module) {
      case "m2":
        set({
          activeModule: "m2",
          m2Screen: request.screen,
          m2Intent: request.intent,
        });
        break;
      case "m5a":
        set({
          activeModule: "m5a",
          m5aScreen: request.screen,
        });
        break;
      case "m1":
      case "m6":
        set({ activeModule: request.module });
        break;
    }
  },
});
