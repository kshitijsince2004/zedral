import type { StateCreator } from "zustand";

export interface ConnectivitySlice {
  isOnline: boolean;
  setOnline: (v: boolean) => void;
}

export const createConnectivitySlice: StateCreator<ConnectivitySlice, [], [], ConnectivitySlice> = (set) => ({
  isOnline: true,

  setOnline: (v) => set({ isOnline: v }),
});
