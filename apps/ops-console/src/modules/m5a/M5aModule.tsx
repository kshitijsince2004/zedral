// ─── M5a module root ─────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useStore } from "@/state/store";
import { useRecalcTimer } from "@/hooks/useRecalcTimer";
import { getWorkOrders, getCoils, getInbound, getPipeline, getKpis } from "@/services/m5a";
import type { WorkOrder, Coil, InboundShipment, PipelineStage } from "@/types/m5a";
import type { M5aKpis } from "@/services/m5a";
import { M5aSubNav, M5A_SCREEN_TITLE } from "./M5aSubNav";
import { M5aKpiRow } from "./M5aKpiRow";
import { ReadinessTab } from "./ReadinessTab";
import { CoilsTab } from "./CoilsTab";
import { InboundTab } from "./InboundTab";
import { ForecastTab } from "./ForecastTab";

export function M5aModule() {
  const m5aScreen = useStore((s) => s.m5aScreen);
  const setM5aScreen = useStore((s) => s.setM5aScreen);
  const { secondsRemaining } = useRecalcTimer(300);

  const [_workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [_coils, setCoils] = useState<Coil[]>([]);
  const [_inbound, setInbound] = useState<InboundShipment[]>([]);
  const [_pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [_kpis, setKpis] = useState<M5aKpis | null>(null);

  useEffect(() => {
    getWorkOrders().then(setWorkOrders).catch(console.error);
    getCoils().then(setCoils).catch(console.error);
    getInbound().then(setInbound).catch(console.error);
    getPipeline().then(setPipeline).catch(console.error);
    getKpis().then(setKpis).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{M5A_SCREEN_TITLE[m5aScreen]}</h1>
        <M5aSubNav active={m5aScreen} onChange={setM5aScreen} />
      </div>

      {/* KPI row */}
      <M5aKpiRow />

      {/* Active tab */}
      {m5aScreen === "readiness" && <ReadinessTab recalcSeconds={secondsRemaining} />}
      {m5aScreen === "coils" && <CoilsTab />}
      {m5aScreen === "inbound" && <InboundTab />}
      {m5aScreen === "forecast" && <ForecastTab />}
    </div>
  );
}
