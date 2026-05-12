import { env } from "@/app/env";
import { useStore } from "@/state/store";
import { MODULE_ROLES } from "@/constants/modules";
import type { ModuleId, RBACRole } from "@/types/common";

// ─── Action types ─────────────────────────────────────────────────────────────

export type RBACAction =
  | "reserve_coil"
  | "release_work_order"
  | "edit_master_data"
  | "view_dispatch"
  | "escalate_line";

// ─── Permission map ───────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<RBACRole, RBACAction[]> = {
  admin: [
    "reserve_coil",
    "release_work_order",
    "edit_master_data",
    "view_dispatch",
    "escalate_line",
  ],
  supervisor: ["reserve_coil", "release_work_order", "view_dispatch", "escalate_line"],
  operator: ["view_dispatch"],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRBAC(): {
  role: RBACRole | null;
  can: (action: RBACAction) => boolean;
  canAccessModule: (id: ModuleId) => boolean;
} {
  // In mock mode read role from env; otherwise read from session store
  const sessionRole = useStore((s) => s.role);
  const role: RBACRole | null = env.VITE_USE_MOCK ? env.VITE_MOCK_ROLE : sessionRole;

  function can(action: RBACAction): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(action);
  }

  function canAccessModule(id: ModuleId): boolean {
    if (!role) return false;
    return MODULE_ROLES[id].includes(role);
  }

  return { role, can, canAccessModule };
}
