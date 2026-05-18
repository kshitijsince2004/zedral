import type { StateCreator } from "zustand";
import type { RBACRole } from "@/types/common";
import { mapKeycloakRole } from "@/lib/roleMapper";
import type { KeycloakTokenClaims } from "@/lib/roleMapper";

export interface SessionSlice {
  currentUser: string | null;
  role: RBACRole | null;
  setSession: (user: string, role: RBACRole) => void;
  setSessionFromClaims: (claims: KeycloakTokenClaims) => void;
  clearSession: () => void;
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  currentUser: null,
  role: null,

  setSession: (user, role) => set({ currentUser: user, role }),

  setSessionFromClaims: (claims) => {
    const role = mapKeycloakRole(claims);
    set({ currentUser: claims.preferred_username, role });
  },

  clearSession: () => set({ currentUser: null, role: null }),
});
