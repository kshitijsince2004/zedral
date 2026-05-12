import { env } from "@/app/env";
import { apiFetch } from "./client";
import { SEED_WOS } from "@/mocks/m1";
import type { DemandWO } from "@/types/m1";
import { API } from "@/constants/api";

export async function getWorkOrders(): Promise<DemandWO[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(SEED_WOS);
  return apiFetch<DemandWO[]>(API.m1.workOrders);
}

export async function releaseWorkOrder(woId: string): Promise<DemandWO> {
  if (env.VITE_USE_MOCK) {
    const wo = SEED_WOS.find((w) => w.wo_id === woId);
    if (!wo) throw new Error(`Work order ${woId} not found`);
    return Promise.resolve({ ...wo, status: "Running" });
  }
  return apiFetch<DemandWO>(API.m1.releaseWorkOrder(woId), { method: "POST" });
}

export async function overrideWorkOrder(
  woId: string,
  override: Partial<DemandWO>
): Promise<DemandWO> {
  if (env.VITE_USE_MOCK) {
    const wo = SEED_WOS.find((w) => w.wo_id === woId);
    if (!wo) throw new Error(`Work order ${woId} not found`);
    return Promise.resolve({ ...wo, ...override });
  }
  return apiFetch<DemandWO>(API.m1.overrideWorkOrder(woId), {
    method: "PATCH",
    body: JSON.stringify(override),
  });
}
