import type { StateCreator } from "zustand";
import type { M2Screen, NavIntent } from "@/types/common";
import type { AuditEntry } from "@/types/m2";

const MAX_AUDIT_ENTRIES = 200;

export interface M2Slice {
  m2Screen: M2Screen;
  m2Intent: NavIntent | undefined;
  auditLog: AuditEntry[];
  setM2Screen: (screen: M2Screen) => void;
  setM2Intent: (intent: NavIntent | undefined) => void;
  logAudit: (entry: Omit<AuditEntry, "id" | "ts" | "user">) => void;
  clearAuditLog: () => void;
}

// Minimal AppStore shape needed for logAudit to read session state
interface StoreWithSession extends M2Slice {
  currentUser?: string | null;
}

export const createM2Slice: StateCreator<StoreWithSession, [], [], M2Slice> = (set, get) => ({
  m2Screen: "overview",
  m2Intent: undefined,
  auditLog: [],

  setM2Screen: (screen) => set({ m2Screen: screen }),

  setM2Intent: (intent) => set({ m2Intent: intent }),

  logAudit: (entry) => {
    const user = (get() as StoreWithSession).currentUser ?? "system";
    const newEntry: AuditEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      user,
    };
    set((state) => {
      const updated = [...state.auditLog, newEntry];
      return {
        auditLog: updated.length > MAX_AUDIT_ENTRIES
          ? updated.slice(updated.length - MAX_AUDIT_ENTRIES)
          : updated,
      };
    });
  },

  clearAuditLog: () => set({ auditLog: [] }),
});
