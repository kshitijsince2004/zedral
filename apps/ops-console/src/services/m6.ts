import { env } from "@/app/env";
import { apiFetch, createEventSource } from "./client";
import { INITIAL_LINES, ALERTS, DISPATCH_LIST } from "@/mocks/m6";
import type { ProductionLine, AlertRow, JobRow } from "@/types/m6";
import { API } from "@/constants/api";

export async function getLines(): Promise<ProductionLine[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(INITIAL_LINES);
  return apiFetch<ProductionLine[]>(API.m6.lines);
}

export async function getAlerts(): Promise<AlertRow[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(ALERTS);
  return apiFetch<AlertRow[]>(API.m6.alerts);
}

export async function getDispatchList(wcId: string): Promise<JobRow[]> {
  if (env.VITE_USE_MOCK) {
    return Promise.resolve(DISPATCH_LIST[wcId] ?? []);
  }
  return apiFetch<JobRow[]>(`${API.m6.dispatch}?wc=${encodeURIComponent(wcId)}`);
}

/**
 * getLiveStatus — returns current production line data.
 * When VITE_USE_SSE=true: opens an EventSource and resolves with the first
 * message received, then closes the connection (one-shot snapshot).
 * When VITE_USE_SSE=false (default): polls via apiFetch.
 */
export function getLiveStatus(): Promise<ProductionLine[]> {
  if (env.VITE_USE_MOCK) return Promise.resolve(INITIAL_LINES);

  if (env.VITE_USE_SSE) {
    return new Promise<ProductionLine[]>((resolve, reject) => {
      const close = createEventSource(API.m6.liveStatus, (data) => {
        close();
        resolve(data as ProductionLine[]);
      });
      // Reject after 10 s if no message arrives
      setTimeout(() => {
        close();
        reject(new Error("SSE timeout: no message received within 10 s"));
      }, 10_000);
    });
  }

  return apiFetch<ProductionLine[]>(API.m6.liveStatus);
}
