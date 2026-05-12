import { create } from "zustand";
import type { StateCreator } from "zustand";

import { createNavigationSlice } from "./slices/navigation";
import type { NavigationSlice } from "./slices/navigation";
import { createSessionSlice } from "./slices/session";
import type { SessionSlice } from "./slices/session";
import { createM5aSlice } from "./slices/m5a";
import type { M5aSlice } from "./slices/m5a";
import { createM2Slice } from "./slices/m2";
import type { M2Slice } from "./slices/m2";
import { createConnectivitySlice } from "./slices/connectivity";
import type { ConnectivitySlice } from "./slices/connectivity";

export type AppStore = NavigationSlice & SessionSlice & M5aSlice & M2Slice & ConnectivitySlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createNavigationSlice(...(a as Parameters<StateCreator<AppStore, [], [], NavigationSlice>>)),
  ...createSessionSlice(...a),
  ...createM5aSlice(...a),
  ...createM2Slice(...a),
  ...createConnectivitySlice(...a),
}));
