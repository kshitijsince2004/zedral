import { useState, useEffect } from "react";
import * as m1 from "@/services/m1";
import * as m2 from "@/services/m2";
import * as m5a from "@/services/m5a";
import * as m6 from "@/services/m6";

// ─── Service registry ─────────────────────────────────────────────────────────

// Maps dot-notation keys to the actual service functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SERVICE_MAP: Record<string, () => Promise<any>> = {
  "m1.getWorkOrders": m1.getWorkOrders,
  "m2.getMaterials": m2.getMaterials,
  "m2.getWorkCentres": m2.getWorkCentres,
  "m2.getCustomers": m2.getCustomers,
  "m2.getRoutings": m2.getRoutings,
  "m2.getOperators": m2.getOperators,
  "m2.getShifts": m2.getShifts,
  "m5a.getWorkOrders": m5a.getWorkOrders,
  "m5a.getCoils": m5a.getCoils,
  "m5a.getInbound": m5a.getInbound,
  "m5a.getPipeline": m5a.getPipeline,
  "m5a.getKpis": m5a.getKpis,
  "m6.getLines": m6.getLines,
  "m6.getAlerts": m6.getAlerts,
  "m6.getLiveStatus": m6.getLiveStatus,
};

// ─── Return type ──────────────────────────────────────────────────────────────

export interface LiveDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveData<T>(
  serviceKey: string,
  pollingIntervalMs: number
): LiveDataState<T> {
  const [state, setState] = useState<LiveDataState<T>>({
    data: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  useEffect(() => {
    const serviceFn = SERVICE_MAP[serviceKey] as (() => Promise<T>) | undefined;

    if (!serviceFn) {
      setState({
        data: null,
        isLoading: false,
        error: new Error(`useLiveData: unknown serviceKey "${serviceKey}"`),
        lastUpdated: null,
      });
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const data = await serviceFn!();
        if (!cancelled) {
          setState({ data, isLoading: false, error: null, lastUpdated: new Date() });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      }
    }

    // Fetch immediately on mount
    poll();

    const intervalId = setInterval(poll, pollingIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [serviceKey, pollingIntervalMs]);

  return state;
}
