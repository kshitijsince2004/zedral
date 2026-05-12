import { useEffect, useMemo, useState } from "react";
import { toneText, toneBg, toneBorder, toneRail } from "@/types/common";
import type { Tone } from "@/types/common";
import type { ProductionLine, AlertRow, JobRow, EventRow, RejectRow, LineStatus } from "@/types/m6";
import { DISPATCH_LIST, ALERTS, EVENTS, REJECTS } from "@/mocks/m6";
import { useLiveData } from "@/hooks/useLiveData";
import { toISTClock } from "@/utils/date";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_TONE: Record<LineStatus, Tone> = {
  running: "success",
  setup: "info",
  stopped: "destructive",
  at_risk: "warning",
  idle: "muted",
};

const STATUS_LABEL: Record<LineStatus, string> = {
  running: "Running",
  setup: "Setup",
  stopped: "Stopped",
  at_risk: "At Risk",
  idle: "Idle",
};

// ─── M6Module ─────────────────────────────────────────────────────────────────

type SubScreen = "live" | "dispatch" | "alerts" | "kpi";

export function M6Module() {
  const [screen, setScreen] = useState<SubScreen>("live");
  const [drillLine, setDrillLine] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Live line data via useLiveData hook (replaces hardcoded setInterval)
  const { data: liveLines } = useLiveData<ProductionLine[]>("m6.getLiveStatus", 3000);

  // Simulate production tick on top of live data
  const [lines, setLines] = useState<ProductionLine[]>([]);

  useEffect(() => {
    if (liveLines && lines.length === 0) {
      setLines(liveLines);
    }
  }, [liveLines, lines.length]);

  // Single useEffect for clock + production simulation — cleared on unmount
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setLines((prev) =>
        prev.map((l) => {
          if (l.status === "running") {
            return {
              ...l,
              progress: Math.min(100, l.progress + 0.6),
              actualMt: Math.min(l.targetMt, +(l.actualMt + 0.5).toFixed(1)),
            };
          }
          if (l.status === "stopped" && l.stoppage) {
            return { ...l, stoppage: { ...l.stoppage, durationMin: l.stoppage.durationMin + 1 / 60 } };
          }
          if (l.status === "setup" && l.setupElapsed != null) {
            return { ...l, setupElapsed: l.setupElapsed + 1 / 60 };
          }
          return l;
        }),
      );
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const istClock = useMemo(() => toISTClock(now), [now]);
  const shiftRemaining = "2h 30m";

  const totalActual = lines.reduce((s, l) => s + l.actualMt, 0);
  const totalTarget = lines.reduce((s, l) => s + l.targetMt, 0);
  const totalDowntime = lines.reduce((s, l) => s + (l.stoppage?.durationMin ?? 0), 0);
  const totalSetup = lines.reduce((s, l) => s + (l.setupElapsed ?? 0), 0);
  const totalRejects = Object.values(REJECTS).flat().length;
  const totalScrap = Object.values(REJECTS).flat().reduce((s, r) => s + r.qty, 0);
  const criticalAlerts = ALERTS.filter((a) => a.severity === "critical").length;

  const totalLines = lines.length;
  const activeLines = lines.filter((l) => l.status === "running" || l.status === "setup").length;
  const machinesRunning = lines.filter((l) => l.status === "running").length;
  const totalIssues = ALERTS.length;
  const m6Status: "running" | "partial" | "critical" =
    criticalAlerts > 0 ? "critical" : activeLines < totalLines ? "partial" : "running";

  const elapsedHours = 7.5;
  const productionRate = totalActual / elapsedHours;
  const avgEfficiency = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  const allJobs = Object.values(DISPATCH_LIST).flat();
  const flowCounts = {
    released: allJobs.length,
    running: allJobs.filter((j) => j.status === "running" || j.status === "setup").length,
    waiting: allJobs.filter((j) => j.status === "queued").length,
    completed: allJobs.filter((j) => j.status === "done").length,
  };

  if (drillLine) {
    const line = lines.find((l) => l.id === drillLine);
    if (line) return <DrillDown line={line} onBack={() => setDrillLine(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SubNav screen={screen} setScreen={setScreen} criticalAlerts={criticalAlerts} />
      <Header
        istClock={istClock}
        shiftRemaining={shiftRemaining}
        m6Status={m6Status}
        activeLines={activeLines}
        totalLines={totalLines}
        machinesRunning={machinesRunning}
        totalIssues={totalIssues}
      />

      {screen === "live" && (
        <>
          <LiveLineGrid lines={lines} onDrill={setDrillLine} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ProductionFlowPanel counts={flowCounts} />
            <WorkCentreLoadPanel lines={lines} />
          </div>
          <KpiBar
            actual={totalActual}
            target={totalTarget}
            setup={totalSetup}
            downtime={totalDowntime}
            rejects={totalRejects}
            scrap={totalScrap}
            rate={productionRate}
            efficiency={avgEfficiency}
          />
        </>
      )}

      {screen === "dispatch" && <DispatchListView lines={lines} />}
      {screen === "alerts" && <AlertsPanel alerts={ALERTS} onDrill={setDrillLine} />}
      {screen === "kpi" && (
        <KpiDetailScreen
          actual={totalActual}
          target={totalTarget}
          setup={totalSetup}
          downtime={totalDowntime}
          rejects={totalRejects}
          scrap={totalScrap}
          rate={productionRate}
          efficiency={avgEfficiency}
          lines={lines}
        />
      )}
    </div>
  );
}

// ─── Sub-nav ──────────────────────────────────────────────────────────────────

function SubNav({
  screen,
  setScreen,
  criticalAlerts,
}: {
  screen: SubScreen;
  setScreen: (s: SubScreen) => void;
  criticalAlerts: number;
}) {
  const items: { id: SubScreen; label: string; badge?: number }[] = [
    { id: "live", label: "Live Lines" },
    { id: "dispatch", label: "Dispatch List" },
    { id: "alerts", label: "Alerts", badge: criticalAlerts },
    { id: "kpi", label: "KPI Detail" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-1.5 inline-flex gap-1 self-start">
      {items.map((it) => {
        const active = screen === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setScreen(it.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {it.label}
            {it.badge != null && it.badge > 0 && (
              <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold ${
                active ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
              }`}>
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  istClock,
  shiftRemaining,
  m6Status,
  activeLines,
  totalLines,
  machinesRunning,
  totalIssues,
}: {
  istClock: string;
  shiftRemaining: string;
  m6Status: "running" | "partial" | "critical";
  activeLines: number;
  totalLines: number;
  machinesRunning: number;
  totalIssues: number;
}) {
  const statusTone: Record<typeof m6Status, Tone> = {
    running: "success",
    partial: "warning",
    critical: "destructive",
  };
  const statusLabel: Record<typeof m6Status, string> = {
    running: "Running",
    partial: "Partial",
    critical: "Critical",
  };
  const t = statusTone[m6Status];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm px-6 py-4 flex items-center gap-6 flex-wrap">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">M6 Status</div>
        <span className={`inline-flex items-center gap-2 mt-1 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${toneText[t]} ${toneBg[t]} ${toneBorder[t]}`}>
          <span className={`h-2 w-2 rounded-full ${toneRail[t]} ${m6Status !== "running" ? "animate-pulse-dot" : ""}`} />
          {statusLabel[m6Status]}
        </span>
      </div>
      <div className="h-10 w-px bg-border" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active Lines</div>
        <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground mt-0.5">
          {activeLines}<span className="text-muted-foreground text-base"> / {totalLines}</span>
        </div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Machines Running</div>
        <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-success mt-0.5">{machinesRunning}</div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total Issues</div>
        <div className={`font-mono text-2xl font-bold tabular-nums tracking-tight mt-0.5 ${totalIssues > 0 ? "text-destructive" : "text-foreground"}`}>{totalIssues}</div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Shift</div>
        <div className="text-base font-bold text-foreground mt-0.5">A · 06:00 → 14:00</div>
        <div className="text-[10px] text-warning font-mono">remaining {shiftRemaining}</div>
      </div>
      <div className="flex-1" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Time · IST</div>
        <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground mt-0.5">{istClock}</div>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-success">
        <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
        Live · 3s
      </span>
    </div>
  );
}

// ─── Production Flow Panel ────────────────────────────────────────────────────

function ProductionFlowPanel({ counts }: { counts: { released: number; running: number; waiting: number; completed: number } }) {
  const items: { label: string; value: number; tone: Tone }[] = [
    { label: "Released", value: counts.released, tone: "info" },
    { label: "Running", value: counts.running, tone: "success" },
    { label: "Waiting", value: counts.waiting, tone: "warning" },
    { label: "Completed", value: counts.completed, tone: "purple" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border text-sm font-semibold flex items-center gap-2">
        Production Flow
        <span className="text-xs text-muted-foreground font-normal">· orders M1 → M6</span>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border">
        {items.map((it) => (
          <div key={it.label} className="px-4 py-5 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{it.label}</div>
            <div className={`mt-2 font-mono text-3xl font-bold tabular-nums ${toneText[it.tone]}`}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Work Centre Load Panel ───────────────────────────────────────────────────

function WorkCentreLoadPanel({ lines }: { lines: ProductionLine[] }) {
  const rows = lines.map((l) => {
    const jobs = DISPATCH_LIST[l.id] || [];
    const queued = jobs.filter((j) => j.status === "queued").length;
    const total = jobs.length;
    let badge: { label: string; tone: Tone } = { label: "NORMAL", tone: "success" };
    if (l.status === "idle") badge = { label: "IDLE", tone: "muted" };
    else if (queued >= 3) badge = { label: "OVERLOADED", tone: "destructive" };
    else if (queued === 0) badge = { label: "DRAINING", tone: "warning" };
    return { id: l.id, total, queued, badge };
  });
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border text-sm font-semibold flex items-center gap-2">
        Work Centre Load
        <span className="text-xs text-muted-foreground font-normal">· jobs queued per line</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="px-5 py-3 flex items-center gap-4">
            <div className="font-bold tracking-tight w-16">{r.id}</div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.max(r.total, 1) }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3 w-6 rounded-sm ${i < r.total - r.queued ? "bg-success/70" : i < r.total ? "bg-warning/60" : "bg-secondary"}`}
                  />
                ))}
              </div>
            </div>
            <div className="font-mono text-xs text-muted-foreground tabular-nums w-20 text-right">{r.queued} queued</div>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider w-32 justify-center ${toneText[r.badge.tone]} ${toneBg[r.badge.tone]} ${toneBorder[r.badge.tone]}`}>
              {r.badge.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Line Grid ───────────────────────────────────────────────────────────

function LiveLineGrid({ lines, onDrill }: { lines: ProductionLine[]; onDrill: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {lines.map((l) => (
        <LineCard key={l.id} line={l} onDrill={onDrill} />
      ))}
    </div>
  );
}

function LineCard({ line, onDrill }: { line: ProductionLine; onDrill: (id: string) => void }) {
  const tone = STATUS_TONE[line.status];
  const onPace = line.actualMt / line.targetMt >= 0.55;

  return (
    <div className={`relative rounded-2xl border-2 bg-card shadow-sm overflow-hidden flex flex-col ${toneBorder[tone]}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${toneRail[tone]}`} />
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{line.id}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Op: {line.operator}</div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${toneText[tone]} ${toneBg[tone]} ${toneBorder[tone]}`}>
          <span className={`h-2 w-2 rounded-full ${toneRail[tone]} ${line.status === "stopped" ? "animate-pulse-dot" : ""}`} />
          {STATUS_LABEL[line.status]}
        </span>
      </div>
      <div className="px-5 py-3 border-y border-border bg-secondary/40">
        <div className="font-mono text-sm font-semibold text-foreground">{line.woId}</div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {line.material} · {line.gauge} × {line.width}
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {line.status === "running" && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Progress</span>
              <span className="font-mono text-xl font-bold text-success tabular-nums">{line.progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-success transition-all" style={{ width: `${line.progress}%` }} />
            </div>
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Start {line.startTime}</span>
              <span>End {line.plannedEnd}</span>
            </div>
          </>
        )}
        {line.status === "setup" && (
          <div className="rounded-xl border border-info/30 bg-info/10 p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-info">Setup in progress</div>
            <div className="text-sm text-foreground mt-1">{line.setupNote}</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-sm text-info font-bold">
                {Math.round(line.setupElapsed ?? 0)} / {line.setupPlanned} min
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {Math.round(((line.setupElapsed ?? 0) / (line.setupPlanned || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-info/20 overflow-hidden">
              <div
                className="h-full bg-info transition-all"
                style={{ width: `${Math.min(100, ((line.setupElapsed ?? 0) / (line.setupPlanned || 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {line.status === "stopped" && line.stoppage && (
          <div className="rounded-xl border border-warning/40 bg-warning/15 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-warning">Active stoppage</span>
              <span className="font-mono text-base font-bold text-warning tabular-nums">
                {Math.round(line.stoppage.durationMin)} min
              </span>
            </div>
            <div className="text-sm text-foreground mt-1">{line.stoppage.reason}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              Started {line.stoppage.startedAt} · {line.stoppage.category}
            </div>
          </div>
        )}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Target / Actual</span>
          <div className="font-mono text-sm">
            <span className={onPace ? "text-success font-bold" : "text-destructive font-bold"}>
              {line.actualMt.toFixed(1)}
            </span>
            <span className="text-muted-foreground"> / {line.targetMt} MT</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-border">
          <span className="text-muted-foreground">Coil</span>
          <span className="text-info font-semibold">{line.coilId}</span>
          <span className="text-muted-foreground">@ {line.coilMountedAt}</span>
        </div>
      </div>
      <div className="mt-auto p-4 border-t border-border bg-secondary/30 grid grid-cols-3 gap-2">
        <button
          onClick={() => onDrill(line.id)}
          className="h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          Details
        </button>
        <button className="h-11 rounded-xl border-2 border-warning/50 text-warning text-sm font-bold hover:bg-warning/10 transition-colors">
          Escalate
        </button>
        <button className="h-11 rounded-xl border-2 border-input text-foreground text-sm font-bold hover:bg-secondary transition-colors">
          Inject Job
        </button>
      </div>
    </div>
  );
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

function KpiBar({
  actual, target, setup, downtime, rejects, scrap, rate, efficiency,
}: {
  actual: number; target: number; setup: number; downtime: number;
  rejects: number; scrap: number; rate: number; efficiency: number;
}) {
  const cards: { label: string; value: string; sub: string; tone: Tone }[] = [
    { label: "Production", value: `${actual.toFixed(0)} / ${target} MT`, sub: `${((actual / target) * 100).toFixed(0)}% of target`, tone: "success" },
    { label: "Production Rate", value: `${rate.toFixed(1)} MT/hr`, sub: "Plant-wide live rate", tone: "accent" },
    { label: "Avg Efficiency", value: `${efficiency.toFixed(0)}%`, sub: "Actual vs target", tone: efficiency >= 75 ? "success" : efficiency >= 50 ? "warning" : "destructive" },
    { label: "Setup Time", value: `${Math.round(setup)} min`, sub: "Cumulative across lines", tone: "info" },
    { label: "Downtime", value: `${Math.round(downtime)} min`, sub: "Active stoppages", tone: "warning" },
    { label: "Rejects", value: String(rejects), sub: "Coils flagged", tone: "destructive" },
    { label: "Scrap", value: `${scrap.toFixed(2)} MT`, sub: "Total this shift", tone: "purple" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className={`absolute inset-y-0 left-0 w-1 ${toneRail[c.tone]}`} />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold pl-2">{c.label}</div>
          <div className={`mt-2 font-mono text-xl font-bold tabular-nums pl-2 ${toneText[c.tone]}`}>{c.value}</div>
          <div className="text-[10px] text-muted-foreground mt-1 pl-2">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Dispatch List View ───────────────────────────────────────────────────────

function DispatchListView({ lines }: { lines: ProductionLine[] }) {
  return (
    <div className="flex flex-col gap-5">
      {lines.map((line) => (
        <div key={line.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-3">
            <span className="text-base font-bold tracking-tight">{line.id}</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneText[STATUS_TONE[line.status]]} ${toneBg[STATUS_TONE[line.status]]} ${toneBorder[STATUS_TONE[line.status]]}`}>
              {STATUS_LABEL[line.status]}
            </span>
            <span className="text-xs text-muted-foreground">Op: {line.operator}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="border-b border-border">
                {["WO ID", "Status", "Material", "Qty MT", "Planned", "Actual"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(DISPATCH_LIST[line.id] || []).map((j) => {
                const isCurrent = j.status === "running" || j.status === "setup";
                const tone: Tone = j.status === "running" ? "success" : j.status === "setup" ? "info" : "muted";
                return (
                  <tr key={j.wo} className={`border-b border-border last:border-0 ${isCurrent ? "bg-accent/10 ring-1 ring-inset ring-accent/30" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{j.wo}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneText[tone]} ${toneBg[tone]} ${toneBorder[tone]}`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{j.material}</td>
                    <td className="px-4 py-3 font-mono text-xs">{j.qty}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.plannedStart} → {j.plannedEnd}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {j.actualStart ? `${j.actualStart} → ${j.actualEnd ?? "…"}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertsPanel({ alerts, onDrill }: { alerts: AlertRow[]; onDrill: (id: string) => void }) {
  const sevTone: Record<AlertRow["severity"], Tone> = { critical: "destructive", warning: "warning", info: "info" };
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <span className="text-sm font-semibold">Critical alerts</span>
        <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
          {alerts.filter((a) => a.severity === "critical").length} critical
        </span>
        <span className="text-xs text-muted-foreground ml-auto">Auto-refresh 3s</span>
      </div>
      <div className="divide-y divide-border">
        {alerts.map((a) => {
          const tone = sevTone[a.severity];
          return (
            <div key={a.id} className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/40 transition-colors">
              <div className={`h-10 w-1 rounded-full ${toneRail[tone]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold uppercase tracking-wider ${toneText[tone]} ${toneBg[tone]} ${toneBorder[tone]}`}>
                    {a.severity}
                  </span>
                  <span className="font-mono font-semibold">{a.line}</span>
                  <span className="text-muted-foreground font-mono">{a.at}</span>
                </div>
                <div className="text-sm text-foreground mt-1">{a.message}</div>
              </div>
              <button
                onClick={() => onDrill(a.line)}
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                View line
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KPI Detail Screen ────────────────────────────────────────────────────────

function KpiDetailScreen(props: {
  actual: number; target: number; setup: number; downtime: number;
  rejects: number; scrap: number; rate: number; efficiency: number;
  lines: ProductionLine[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <KpiBar {...props} />
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-sm font-semibold">Per-line breakdown</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr className="border-b border-border">
              {["Line", "Status", "Actual MT", "Target MT", "Pace", "Stoppage"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.lines.map((l) => {
              const pace = (l.actualMt / l.targetMt) * 100;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-bold">{l.id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneText[STATUS_TONE[l.status]]} ${toneBg[STATUS_TONE[l.status]]} ${toneBorder[STATUS_TONE[l.status]]}`}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{l.actualMt.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.targetMt}</td>
                  <td className={`px-4 py-3 font-mono text-xs font-bold ${pace >= 55 ? "text-success" : "text-destructive"}`}>{pace.toFixed(0)}%</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {l.stoppage ? `${Math.round(l.stoppage.durationMin)} min · ${l.stoppage.category}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Drill-down ───────────────────────────────────────────────────────────────

function DrillDown({ line, onBack }: { line: ProductionLine; onBack: () => void }) {
  const tone = STATUS_TONE[line.status];
  const jobs = DISPATCH_LIST[line.id] || [];
  const events = EVENTS[line.id] || [];
  const rejects = REJECTS[line.id] || [];
  const eventTone: Record<EventRow["type"], Tone> = {
    setup: "info",
    production: "success",
    stoppage: "warning",
    complete: "purple",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card shadow-sm px-6 py-5 flex items-center gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="h-10 px-4 rounded-xl border border-input text-foreground text-sm font-bold hover:bg-secondary transition-colors"
        >
          ← Back to live
        </button>
        <div>
          <div className="text-3xl font-bold tracking-tight">{line.id}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Op: {line.operator}</div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${toneText[tone]} ${toneBg[tone]} ${toneBorder[tone]}`}>
          <span className={`h-2 w-2 rounded-full ${toneRail[tone]}`} />
          {STATUS_LABEL[line.status]}
        </span>
        <div className="flex-1" />
        <div className="text-sm font-mono">
          <span className="text-muted-foreground">Current: </span>
          <span className="font-bold">{line.woId}</span>
        </div>
      </div>

      <ControlActions line={line} />

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-sm font-semibold">Dispatch sequence</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr className="border-b border-border">
              {["WO ID", "Status", "Material", "Qty", "Planned", "Actual"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j: JobRow) => {
              const isCurrent = j.status === "running" || j.status === "setup";
              const t: Tone = j.status === "running" ? "success" : j.status === "setup" ? "info" : "muted";
              return (
                <tr key={j.wo} className={`border-b border-border last:border-0 ${isCurrent ? "bg-accent/10 ring-1 ring-inset ring-accent/30" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{j.wo}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneText[t]} ${toneBg[t]} ${toneBorder[t]}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{j.material}</td>
                  <td className="px-4 py-3 font-mono text-xs">{j.qty}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{j.plannedStart} → {j.plannedEnd}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {j.actualStart ? `${j.actualStart} → ${j.actualEnd ?? "…"}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold">Event timeline</div>
          <div className="p-5 space-y-3">
            {events.map((e: EventRow, i: number) => {
              const t = eventTone[e.type];
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-2.5 w-2.5 rounded-full mt-1.5 ${toneRail[t]}`} />
                    {i < events.length - 1 && <div className="flex-1 w-px bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{e.ts}</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneText[t]} ${toneBg[t]} ${toneBorder[t]}`}>
                        {e.type}
                      </span>
                    </div>
                    <div className="text-sm text-foreground mt-1">{e.detail}</div>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && <div className="text-xs text-muted-foreground italic">No events yet</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold flex items-center justify-between">
            Reject log
            <span className="text-xs text-muted-foreground">{rejects.length} entries</span>
          </div>
          {rejects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No rejects on this line</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="border-b border-border">
                  {["Time", "Qty MT", "Reason", "Coil"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rejects.map((r: RejectRow, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{r.ts}</td>
                    <td className="px-4 py-3 font-mono text-xs text-destructive font-bold">{r.qty.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs">{r.reason}</td>
                    <td className="px-4 py-3 font-mono text-xs text-info">{r.coil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Control Actions ──────────────────────────────────────────────────────────

function ControlActions({ line }: { line: ProductionLine }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const trigger = (id: string) => setConfirming(id);
  const confirm = (label: string) => {
    setConfirming(null);
    setToast(`${label} command sent to ${line.id}`);
    setTimeout(() => setToast(null), 3000);
  };

  const stopDisabled = line.status !== "running" && line.status !== "setup";

  const actions: { id: string; label: string; tone: Tone; disabled?: boolean; help: string }[] = [
    { id: "stop", label: "Stop Line", tone: "destructive", disabled: stopDisabled, help: stopDisabled ? "Line is not active" : "Halt current job immediately" },
    { id: "change", label: "Change Job", tone: "info", help: "Swap current WO for next queued" },
    { id: "operator", label: "Assign Operator", tone: "accent", help: "Reassign or replace operator" },
    { id: "issue", label: "Report Issue", tone: "warning", help: "Log a stoppage / quality concern" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <span className="text-sm font-semibold">Control actions</span>
        <span className="text-xs text-muted-foreground">· execute on {line.id}</span>
        {toast && (
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            {toast}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
        {actions.map((a) => {
          const isConfirming = confirming === a.id;
          return (
            <div key={a.id} className={`rounded-xl border p-3 flex flex-col gap-2 ${toneBorder[a.tone]} ${toneBg[a.tone]}`}>
              <div className={`text-xs uppercase tracking-wider font-bold ${toneText[a.tone]}`}>{a.label}</div>
              <div className="text-[11px] text-muted-foreground min-h-[28px]">{a.help}</div>
              {isConfirming ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => confirm(a.label)}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold uppercase tracking-wider text-primary-foreground ${toneRail[a.tone]} hover:opacity-90 transition-opacity`}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="flex-1 h-9 rounded-lg border border-input text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  disabled={a.disabled}
                  onClick={() => trigger(a.id)}
                  className={`h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    a.disabled
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : `${toneRail[a.tone]} text-primary-foreground hover:opacity-90`
                  }`}
                >
                  {a.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
