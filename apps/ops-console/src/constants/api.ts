/**
 * Typed API endpoint path constants for all four MES modules.
 * Paths are relative to VITE_API_BASE_URL.
 */
export const API = {
  m1: {
    workOrders: "/api/m1/work-orders",
    releaseWorkOrder: (id: string) => `/api/m1/work-orders/${id}/release`,
    overrideWorkOrder: (id: string) => `/api/m1/work-orders/${id}/override`,
  },
  m2: {
    materials: "/api/m2/materials",
    workCentres: "/api/m2/work-centres",
    customers: "/api/m2/customers",
    routings: "/api/m2/routings",
    operators: "/api/m2/operators",
    shifts: "/api/m2/shifts",
  },
  m5a: {
    workOrders: "/api/m5a/work-orders",
    coils: "/api/m5a/coils",
    inbound: "/api/m5a/inbound",
    pipeline: "/api/m5a/pipeline",
    kpis: "/api/m5a/kpis",
  },
  m6: {
    lines: "/api/m6/lines",
    alerts: "/api/m6/alerts",
    dispatch: "/api/m6/dispatch",
    liveStatus: "/api/m6/live-status",
  },
} as const;
