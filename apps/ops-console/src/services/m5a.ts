import { env } from "@/app/env";
import { apiFetch } from "./client";
import { WORK_ORDERS, COILS, INBOUND, PIPELINE } from "@/mocks/m5a";
import type { WorkOrder, Coil, InboundShipment, PipelineStage } from "@/types/m5a";
import { API } from "@/constants/api";

export interface M5aKpis {
  totalWos: number;
  readyCount: number;
  partialCount: number;
  shortageCount: number;
  pendingCount: number;
}

export async function getWorkOrders(): Promise<WorkOrder[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(WORK_ORDERS);
  return apiFetch<WorkOrder[]>(API.m5a.workOrders);
}

export async function getCoils(): Promise<Coil[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(COILS);
  return apiFetch<Coil[]>(API.m5a.coils);
}

export async function getInbound(): Promise<InboundShipment[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(INBOUND);
  return apiFetch<InboundShipment[]>(API.m5a.inbound);
}

export async function getPipeline(): Promise<PipelineStage[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(PIPELINE);
  return apiFetch<PipelineStage[]>(API.m5a.pipeline);
}

export async function getKpis(): Promise<M5aKpis> {
  if (env.VITE_USE_MOCK) {
    const wos = WORK_ORDERS;
    return Promise.resolve({
      totalWos: wos.length,
      readyCount: wos.filter((w) => w.status === "ready").length,
      partialCount: wos.filter((w) => w.status === "partial").length,
      shortageCount: wos.filter((w) => w.status === "shortage").length,
      pendingCount: wos.filter((w) => w.status === "pending").length,
    });
  }
  return apiFetch<M5aKpis>(API.m5a.kpis);
}
