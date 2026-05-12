import { create } from "zustand";
import {
  deviceContext as initialDevice,
  mockDispatchItems,
  mockEvents,
} from "@/mocks/data";
import type {
  DispatchItem,
  FloorEvent,
  Handover,
  LineStatus,
  Operator,
  RejectRecord,
  Stoppage,
  UndoAction,
} from "@/types";

type Tab = "home" | "schedule" | "handover" | "menu";

export type HandoverStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "acknowledged";

interface State {
  // auth
  isAuthenticated: boolean;
  operator: Operator | null;

  // device / connectivity
  device: typeof initialDevice;
  isOnline: boolean;
  queuedEventCount: number;

  // dispatch
  dispatch: DispatchItem[];
  events: FloorEvent[];

  // line state
  lineStatus: LineStatus;
  activeStoppage: Stoppage | null;
  rejects: RejectRecord[];

  // handover
  handover: Handover | null;
  handoverStatus: HandoverStatus;
  showHandoverBanner: boolean;
  incomingOperatorPending: boolean;

  // ui
  activeTab: Tab;
  undoAction: UndoAction | null;
  loginPrefill: string;

  // actions — auth/ui
  login: (operator: Operator) => void;
  logout: () => void;
  setTab: (t: Tab) => void;
  setOnline: (v: boolean) => void;
  enqueueEvent: (e: FloorEvent) => void;

  // actions — production
  startSetup: (item_id: string) => void;
  completeSetup: (item_id: string) => void;
  startProduction: (item_id: string) => void;
  completeJob: (
    item_id: string,
    actual_qty: number,
    scrap_qty: number,
    notes?: string,
  ) => void;
  startStoppage: (
    category: string,
    sub_reason?: string,
    notes?: string,
  ) => void;
  endStoppage: () => void;
  raiseReject: (
    item_id: string,
    qty: number,
    category: string,
    disposition: string,
    notes: string,
  ) => void;

  // handover
  triggerHandoverBanner: () => void;
  submitHandover: (h: Omit<Handover, "id" | "submitted_at" | "outgoing_operator" | "shift_from" | "shift_to">) => void;
  acknowledgeHandover: (incoming_comment?: string, newOperator?: Operator) => void;
  setIncomingPending: (v: boolean) => void;

  // undo
  setUndo: (u: UndoAction | null) => void;
  undoLastAction: () => void;

  // dev
  resetAll: () => void;
  jumpToState: (s: LineStatus) => void;
  fastForwardProgress: () => void;
}

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const computeLineStatus = (items: DispatchItem[]): LineStatus => {
  if (items.some((i) => i.actual_status === "production_in_progress"))
    return "production_in_progress";
  if (items.some((i) => i.actual_status === "setup_in_progress"))
    return "setup_in_progress";
  return "idle";
};

export const useFloorConsole = create<State>((set, get) => ({
  isAuthenticated: false,
  operator: null,

  device: initialDevice,
  isOnline: true,
  queuedEventCount: 0,

  dispatch: mockDispatchItems,
  events: mockEvents,

  lineStatus: "production_in_progress",
  activeStoppage: null,
  rejects: [],

  handover: null,
  handoverStatus: "not_started",
  showHandoverBanner: false,
  incomingOperatorPending: false,

  activeTab: "home",
  undoAction: null,
  loginPrefill: "",

  login: (operator) =>
    set({
      isAuthenticated: true,
      operator,
      device: {
        ...get().device,
        operator_id: operator.operator_id,
        operator_name: operator.operator_name,
        shift: operator.shift,
      },
    }),

  logout: () =>
    set({
      isAuthenticated: false,
      operator: null,
      activeTab: "home",
    }),

  setTab: (activeTab) => set({ activeTab }),
  setOnline: (isOnline) =>
    set((s) => ({
      isOnline,
      queuedEventCount: isOnline ? 0 : s.queuedEventCount,
    })),

  enqueueEvent: (e) =>
    set((s) => ({
      events: [e, ...s.events].slice(0, 80),
      queuedEventCount: s.isOnline
        ? s.queuedEventCount
        : s.queuedEventCount + 1,
    })),

  startSetup: (item_id) => {
    const dispatch = get().dispatch.map((i) =>
      i.item_id === item_id
        ? {
            ...i,
            actual_status: "setup_in_progress" as const,
            actual_start: new Date().toISOString(),
          }
        : i,
    );
    set({ dispatch, lineStatus: "setup_in_progress" });
    get().enqueueEvent({
      id: uid("evt"),
      type: "setup_started",
      occurred_at: new Date().toISOString(),
      wo_id: dispatch.find((i) => i.item_id === item_id)?.wo_id,
      operator_id: get().device.operator_id,
    });
  },

  completeSetup: (item_id) => {
    get().enqueueEvent({
      id: uid("evt"),
      type: "setup_ended",
      occurred_at: new Date().toISOString(),
      wo_id: get().dispatch.find((i) => i.item_id === item_id)?.wo_id,
      operator_id: get().device.operator_id,
    });
  },

  startProduction: (item_id) => {
    const dispatch = get().dispatch.map((i) =>
      i.item_id === item_id
        ? {
            ...i,
            actual_status: "production_in_progress" as const,
            actual_start: i.actual_start ?? new Date().toISOString(),
          }
        : i,
    );
    set({ dispatch, lineStatus: "production_in_progress" });
    get().enqueueEvent({
      id: uid("evt"),
      type: "production_started",
      occurred_at: new Date().toISOString(),
      wo_id: dispatch.find((i) => i.item_id === item_id)?.wo_id,
      operator_id: get().device.operator_id,
    });
  },

  completeJob: (item_id, actual_qty, scrap_qty, notes) => {
    const prev = get().dispatch.find((i) => i.item_id === item_id);
    const dispatch = get().dispatch.map((i) =>
      i.item_id === item_id
        ? {
            ...i,
            actual_status: "complete" as const,
            actual_end: new Date().toISOString(),
            qty_actual_mt: actual_qty,
          }
        : i,
    );

    // promote next pending to running
    const nextIdx = dispatch.findIndex(
      (i) => i.actual_status === "pending",
    );
    if (nextIdx >= 0) {
      dispatch[nextIdx] = {
        ...dispatch[nextIdx],
        actual_status: "production_in_progress",
        actual_start: new Date().toISOString(),
        progress_pct: 0,
      };
    }

    set({
      dispatch,
      lineStatus: computeLineStatus(dispatch),
      undoAction: {
        id: uid("undo"),
        kind: "complete_job",
        label: `Job ${prev?.wo_id ?? ""} marked complete`,
        expires_at: Date.now() + 3000,
        payload: { item_id, prev, actual_qty, scrap_qty, notes },
      },
    });
    get().enqueueEvent({
      id: uid("evt"),
      type: "production_completed",
      occurred_at: new Date().toISOString(),
      wo_id: prev?.wo_id,
      qty_good_mt: actual_qty,
    });
  },

  startStoppage: (category, sub_reason, notes) => {
    const stoppage: Stoppage = {
      id: uid("stop"),
      category,
      sub_reason,
      notes,
      started_at: new Date().toISOString(),
    };
    set({ activeStoppage: stoppage, lineStatus: "stopped" });
    get().enqueueEvent({
      id: uid("evt"),
      type: "stoppage_started",
      occurred_at: stoppage.started_at,
      category,
      sub_reason,
      operator_id: get().device.operator_id,
    });
  },

  endStoppage: () => {
    const s = get().activeStoppage;
    if (!s) return;
    const ended_at = new Date().toISOString();
    const duration_min = Math.max(
      1,
      Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000),
    );
    set({
      activeStoppage: null,
      lineStatus: computeLineStatus(get().dispatch),
    });
    get().enqueueEvent({
      id: uid("evt"),
      type: "stoppage_ended",
      occurred_at: ended_at,
      duration_min,
      category: s.category,
    });
  },

  raiseReject: (wo_id, qty_mt, category, disposition, notes) => {
    const reject: RejectRecord = {
      id: uid("rej"),
      wo_id,
      qty_mt,
      category,
      disposition,
      notes,
      raised_at: new Date().toISOString(),
    };
    set((s) => ({ rejects: [reject, ...s.rejects] }));
    get().enqueueEvent({
      id: uid("evt"),
      type: "reject_raised",
      occurred_at: reject.raised_at,
      wo_id,
    });
  },

  triggerHandoverBanner: () => set({ showHandoverBanner: true }),

  submitHandover: (h) => {
    const op = get().operator ?? {
      operator_id: get().device.operator_id,
      operator_name: get().device.operator_name,
      shift: get().device.shift,
    };
    const handover: Handover = {
      ...h,
      id: uid("ho"),
      submitted_at: new Date().toISOString(),
      outgoing_operator: op.operator_name,
      shift_from: op.shift,
      shift_to: op.shift === "A" ? "B" : "A",
    };
    set({
      handover,
      handoverStatus: "submitted",
      showHandoverBanner: false,
      incomingOperatorPending: true,
    });
    get().enqueueEvent({
      id: uid("evt"),
      type: "handover_submitted",
      occurred_at: handover.submitted_at,
      operator_id: op.operator_id,
    });
  },

  acknowledgeHandover: (incoming_comment, newOperator) => {
    const ho = get().handover;
    if (!ho) return;
    set({
      handover: { ...ho, acknowledged_at: new Date().toISOString(), incoming_comment },
      handoverStatus: "acknowledged",
      incomingOperatorPending: false,
      operator: newOperator ?? get().operator,
      device: newOperator
        ? {
            ...get().device,
            operator_id: newOperator.operator_id,
            operator_name: newOperator.operator_name,
            shift: newOperator.shift,
          }
        : get().device,
      activeTab: "home",
    });
  },

  setIncomingPending: (incomingOperatorPending) =>
    set({ incomingOperatorPending }),

  setUndo: (undoAction) => set({ undoAction }),

  undoLastAction: () => {
    const u = get().undoAction;
    if (!u) return;
    if (u.kind === "complete_job") {
      const payload = u.payload as {
        item_id: string;
        prev: DispatchItem;
      };
      // restore previous item state and revert promotion
      const dispatch = get().dispatch.map((i) =>
        i.item_id === payload.item_id ? payload.prev : i,
      );
      // demote item that was auto-promoted (find first running other than prev)
      for (let i = 0; i < dispatch.length; i++) {
        if (
          dispatch[i].item_id !== payload.item_id &&
          dispatch[i].actual_status === "production_in_progress" &&
          !dispatch[i].actual_end
        ) {
          dispatch[i] = {
            ...dispatch[i],
            actual_status: "pending",
            actual_start: null,
          };
          break;
        }
      }
      set({
        dispatch,
        lineStatus: computeLineStatus(dispatch),
        undoAction: null,
      });
    } else {
      set({ undoAction: null });
    }
  },

  resetAll: () => {
    set({
      isAuthenticated: false,
      operator: null,
      device: initialDevice,
      isOnline: true,
      queuedEventCount: 0,
      dispatch: mockDispatchItems,
      events: mockEvents,
      lineStatus: "production_in_progress",
      activeStoppage: null,
      rejects: [],
      handover: null,
      handoverStatus: "not_started",
      showHandoverBanner: false,
      incomingOperatorPending: false,
      activeTab: "home",
      undoAction: null,
    });
  },

  jumpToState: (s) => {
    if (s === "stopped") {
      get().startStoppage("other", undefined, "Dev jump to stopped");
      return;
    }
    if (s === "idle") {
      const dispatch = get().dispatch.map((i) =>
        i.actual_status === "production_in_progress" ||
        i.actual_status === "setup_in_progress"
          ? { ...i, actual_status: "pending" as const, actual_start: null }
          : i,
      );
      set({ dispatch, lineStatus: "idle", activeStoppage: null });
      return;
    }
    if (s === "setup_in_progress") {
      const next = get().dispatch.find((i) => i.actual_status === "pending");
      if (next) get().startSetup(next.item_id);
      return;
    }
    if (s === "production_in_progress") {
      const dispatch = get().dispatch.map((i) =>
        i.item_id === "item_702"
          ? {
              ...i,
              actual_status: "production_in_progress" as const,
              actual_end: null,
              qty_actual_mt: null,
            }
          : i,
      );
      set({ dispatch, lineStatus: "production_in_progress", activeStoppage: null });
    }
  },

  fastForwardProgress: () =>
    set((s) => ({
      dispatch: s.dispatch.map((i) =>
        i.actual_status === "production_in_progress"
          ? { ...i, progress_pct: 95, actual_start: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() }
          : i,
      ),
    })),
}));

// helpers (selectors)
export const selectActiveItem = (s: State): DispatchItem | null =>
  s.dispatch.find(
    (i) =>
      i.actual_status === "production_in_progress" ||
      i.actual_status === "setup_in_progress",
  ) ?? null;

export const selectNextItem = (s: State): DispatchItem | null =>
  s.dispatch.find((i) => i.actual_status === "pending") ?? null;
