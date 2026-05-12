import type { ModuleId, ModuleMeta, RBACRole } from "@/types/common";

export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  m1: { code: "M1", title: "Demand & Work Order Control" },
  m2: { code: "M2", title: "Master Data Management" },
  m5a: { code: "M5a", title: "Material & Inventory Control" },
  m6: { code: "M6", title: "Dispatch & Execution Control" },
};

export const NAV_ITEMS: Array<{ id: ModuleId } & ModuleMeta> = (
  Object.entries(MODULE_META) as [ModuleId, ModuleMeta][]
).map(([id, meta]) => ({ id, ...meta }));

export const MODULE_ROLES: Record<ModuleId, RBACRole[]> = {
  m1: ["admin", "supervisor"],
  m2: ["admin"],
  m5a: ["admin", "supervisor", "operator"],
  m6: ["admin", "supervisor", "operator"],
};
