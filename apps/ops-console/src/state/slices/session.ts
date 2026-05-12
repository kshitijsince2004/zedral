import type { StateCreator } from "zustand";
import type { RBACRole } from "@/types/common";

export interface SessionSlice {
  currentUser: string | null;
  role: RBACRole | null;
  setSession: (user: string, role: RBACRole) => void;
  clearSession: () => void;
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  currentUser: null,
  role: null,

  setSession: (user, role) => set({ currentUser: user, role }),

  clearSession: () => set({ currentUser: null, role: null }),
});
