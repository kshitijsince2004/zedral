import { useEffect, useMemo, useState } from "react";

// ============== Types ==============
type LineStatus = "running" | "setup" | "stopped" | "at_risk" | "idle";
type Tone = "success" | "warning" | "info" | "destructive" | "purple" | "muted" | "accent";

interface Stoppage {
  reason: string;
  category: string;
  startedAt: string;
  durationMin: number;
}
interface ProductionLine {
  id: string;
  status: LineStatus;
  woId: string;
  material: string;
  gauge: string;
  width: string;
  progress: number;
  startTime: string;
  plannedEnd: string;
  targetMt: number;
  actualMt: number;
  coilId: string;
  coilMountedAt: string;
  operator: string;
  stoppage?: Stoppage;
  setupNote?: string;
  setupElapsed?: number;
  setupPlanned?: number;
}

interface JobRow {
  wo: string;
  status: "done" | "running" | "queued" | "setup";
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  material: string;
  qty: number;
}
interface EventRow {
  ts: string;
  type: "setup" | "production" | "stoppage" | "complete";
  detail: string;
}
interface RejectRow {
  ts: string;
  qty: number;
  reason: string;
  coil: string;
}
interface AlertRow {
  id: string;
  severity: "critical" | "warning" | "info";
  line: string;
  message: string;
  at: string;
}

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

const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
  purple: "text-purple",
  muted: "text-muted-foreground",
  accent: "text-accent",
};
const toneBg: Record<Tone, string> = {
  success: "bg-success/10",
  warning: "bg-warning/15",
  info: "bg-info/10",
  destructive: "bg-destructive/10",
  purple: "bg-purple/10",
  muted: "bg-muted",
  accent: "bg-accent/15",
};
const toneBorder: Record<Tone, string> = {
  success: "border-success/30",
  warning: "border-warning/40",
  info: "border-info/30",
  destructive: "border-destructive/40",
  purple: "border-purple/30",
  muted: "border-border",
  accent: "border-accent/40",
};
const toneRail: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  purple: "bg-purple",
  muted: "bg-muted-foreground/40",
  accent: "bg-accent",
};

// ============== Mock data ==============
const INITIAL_LINES: ProductionLine[] = [
  {
    id: "CRS-1",
    status: "running",
    woId: "wo_8893451",
    material: "IS513-D",
    gauge: "0.45",
    width: "1250",
    progress: 67,
    startTime: "09:45",
    plannedEnd: "12:15",
    targetMt: 95,
    actualMt: 52,
    coilId: "HR_298451",
    coilMountedAt: "09:42",
    operator: "Ramesh Kumar",
  },
  {
    id: "CRS-2",
    status: "stopped",
    woId: "wo_8893460",
    material: "IS513-D",
    gauge: "0.50",
    width: "1100",
    progress: 49,
    startTime: "08:30",
    plannedEnd: "11:30",
    targetMt: 78,
    actualMt: 38,
    coilId: "HR_298455",
    coilMountedAt: "08:25",
    operator: "Suresh M.",
    stoppage: {
      reason: "Material wait — next coil not staged",
      category: "Material",
      startedAt: "13:48",
      durationMin: 12,
    },
  },
  {
    id: "CRS-3",
    status: "setup",
    woId: "wo_8893475",
    material: "IS5986-Fe410",
    gauge: "0.80",
    width: "1250",
    progress: 0,
    startTime: "—",
    plannedEnd: "16:20",
    targetMt: 88,
    actualMt: 40,
    coilId: "HR_298461",
    coilMountedAt: "—",
    operator: "Anil P.",
    setupNote: "Grade change to IS5986",
    setupElapsed: 8,
    setupPlanned: 140,
  },
  {
    id: "CRS-4",
    status: "running",
    woId: "wo_8893481",
    material: "IS513-D",
    gauge: "0.60",
    width: "1000",
    progress: 34,
    startTime: "11:10",
    plannedEnd: "14:40",
    targetMt: 72,
    actualMt: 25,
    coilId: "HR_298470",
    coilMountedAt: "11:05",
    operator: "Vikram J.",
  },
  {
    id: "CRS-5",
    status: "idle",
    woId: "—",
    material: "—",
    gauge: "—",
    width: "—",
    progress: 0,
    startTime: "—",
    plannedEnd: "—",
    targetMt: 0,
    actualMt: 0,
    coilId: "—",
    coilMountedAt: "—",
    operator: "Unassigned",
  },
  {
    id: "CRS-6",
    status: "running",
    woId: "wo_8893490",
    material: "IS5986-Fe350",
    gauge: "0.70",
    width: "1150",
    progress: 81,
    startTime: "07:55",
    plannedEnd: "13:30",
    targetMt: 110,
    actualMt: 89,
    coilId: "HR_298480",
    coilMountedAt: "07:50",
    operator: "Naveen R.",
  },
];

const ALERTS: AlertRow[] = [
  { id: "AL-104", severity: "critical", line: "CRS-2", message: "Stopped > 10 min · Material wait", at: "14:00" },
  { id: "AL-105", severity: "critical", line: "CRS-5", message: "Idle — no operator assigned", at: "13:58" },
  { id: "AL-103", severity: "warning", line: "CRS-2", message: "At risk — actual 49% vs target pace 58%", at: "13:55" },
  { id: "AL-102", severity: "warning", line: "CRS-3", message: "Setup nearing 50% of planned window", at: "13:48" },
  { id: "AL-101", severity: "info", line: "CRS-1", message: "Coil HR_298451 will deplete in ~22 min", at: "13:40" },
];

const DISPATCH_LIST: Record<string, JobRow[]> = {
  "CRS-1": [
    { wo: "wo_8893440", status: "done", plannedStart: "06:00", plannedEnd: "09:30", actualStart: "06:05", actualEnd: "09:42", material: "IS513-D 0.45×1250", qty: 28 },
    { wo: "wo_8893451", status: "running", plannedStart: "09:45", plannedEnd: "12:15", actualStart: "09:45", material: "IS513-D 0.45×1250", qty: 18.45 },
    { wo: "wo_8893462", status: "queued", plannedStart: "12:30", plannedEnd: "14:30", material: "IS513-D 0.50×1100", qty: 22 },
    { wo: "wo_8893478", status: "queued", plannedStart: "14:45", plannedEnd: "17:00", material: "IS513-D 0.60×1000", qty: 26.5 },
  ],
  "CRS-2": [
    { wo: "wo_8893445", status: "done", plannedStart: "06:00", plannedEnd: "08:25", actualStart: "06:08", actualEnd: "08:30", material: "IS513-D 0.50×1100", qty: 24 },
    { wo: "wo_8893460", status: "running", plannedStart: "08:30", plannedEnd: "11:30", actualStart: "08:30", material: "IS513-D 0.50×1100", qty: 14 },
    { wo: "wo_8893471", status: "queued", plannedStart: "11:45", plannedEnd: "14:00", material: "IS513-D 0.45×1250", qty: 21 },
  ],
  "CRS-3": [
    { wo: "wo_8893450", status: "done", plannedStart: "06:00", plannedEnd: "10:30", actualStart: "06:00", actualEnd: "10:35", material: "IS5986 0.60×1100", qty: 40 },
    { wo: "wo_8893475", status: "setup", plannedStart: "13:40", plannedEnd: "16:20", actualStart: "13:40", material: "IS5986-Fe410 0.80×1250", qty: 22 },
    { wo: "wo_8893488", status: "queued", plannedStart: "16:30", plannedEnd: "19:00", material: "IS5986-Fe410 0.80×1250", qty: 26 },
  ],
  "CRS-4": [
    { wo: "wo_8893481", status: "running", plannedStart: "11:10", plannedEnd: "14:40", actualStart: "11:10", material: "IS513-D 0.60×1000", qty: 24 },
    { wo: "wo_8893492", status: "queued", plannedStart: "14:55", plannedEnd: "17:30", material: "IS513-D 0.55×1100", qty: 28 },
  ],
  "CRS-5": [
    { wo: "wo_8893455", status: "done", plannedStart: "06:00", plannedEnd: "10:00", actualStart: "06:05", actualEnd: "10:12", material: "IS513-D 0.50×1100", qty: 32 },
  ],
  "CRS-6": [
    { wo: "wo_8893490", status: "running", plannedStart: "07:55", plannedEnd: "13:30", actualStart: "07:55", material: "IS5986 0.70×1150", qty: 35 },
    { wo: "wo_8893498", status: "queued", plannedStart: "13:45", plannedEnd: "16:00", material: "IS5986 0.70×1150", qty: 22 },
    { wo: "wo_8893502", status: "queued", plannedStart: "16:15", plannedEnd: "18:45", material: "IS5986 0.65×1100", qty: 26 },
    { wo: "wo_8893510", status: "queued", plannedStart: "19:00", plannedEnd: "21:30", material: "IS5986 0.65×1100", qty: 24 },
  ],
};

const EVENTS: Record<string, EventRow[]> = {
  "CRS-1": [
    { ts: "09:42", type: "setup", detail: "Coil HR_298451 mounted" },
    { ts: "09:45", type: "production", detail: "Job wo_8893451 started" },
    { ts: "11:20", type: "stoppage", detail: "Roll change · 6 min" },
    { ts: "13:25", type: "production", detail: "Resumed · throughput nominal" },
  ],
  "CRS-2": [
    { ts: "08:25", type: "setup", detail: "Coil HR_298455 mounted" },
    { ts: "08:30", type: "production", detail: "Job wo_8893460 started" },
    { ts: "13:48", type: "stoppage", detail: "Material wait — next coil not staged" },
  ],
  "CRS-3": [
    { ts: "10:35", type: "complete", detail: "Job wo_8893450 completed · 40 MT" },
    { ts: "13:40", type: "setup", detail: "Grade change initiated · IS513 → IS5986" },
  ],
};

const REJECTS: Record<string, RejectRow[]> = {
  "CRS-1": [{ ts: "11:05", qty: 0.4, reason: "Edge crack", coil: "HR_298451" }],
  "CRS-2": [],
  "CRS-3": [],
};

// ============== Component ==============
type SubScreen = "live" | "dispatch" | "alerts" | "kpi";

export function M6Module() {
  const [screen, setScreen] = useState<SubScreen>("live");
  const [lines, setLines] = useState(INITIAL_LINES);
  const [drillLine, setDrillLine] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Real-time clock + simulated production tick
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setLines((prev) =>
        prev.map((l) => {
          if (l.status === "running") {
            const inc = Math.min(100 - l.progress, 0.6);
            return {
              ...l,
              progress: Math.min(100, l.progress + inc),
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

  const istClock = useMemo(() => {
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    return ist.toTimeString().slice(0, 8);
  }, [now]);

  const shiftRemaining = "2h 30m";

  // KPI aggregates
  const totalActual = lines.reduce((s, l) => s + l.actualMt, 0);
  const totalTarget = lines.reduce((s, l) => s + l.targetMt, 0);
  const totalDowntime = lines.reduce((s, l) => s + (l.stoppage?.durationMin ?? 0), 0);
  const totalSetup = lines.reduce((s, l) => s + (l.setupElapsed ?? 0), 0);
  const totalRejects = Object.values(REJECTS).flat().length;
  const totalScrap = Object.values(REJECTS).flat().reduce((s, r) => s + r.qty, 0);
  const criticalAlerts = ALERTS.filter((a) => a.severity === "critical").length;

  // Control-bar aggregates
  const totalLines = lines.length;
  const activeLines = lines.filter((l) => l.status === "running" || l.status === "setup").length;
  const machinesRunning = lines.filter((l) => l.status === "running").length;
  const totalIssues = ALERTS.length;
  const m6Status: "running" | "partial" | "critical" =
    criticalAlerts > 0 ? "critical" : activeLines < totalLines ? "partial" : "running";

  // Production rate (MT/hr) — assume shift started 06:00, current 13:30 → ~7.5h elapsed
  const elapsedHours = 7.5;
  const productionRate = totalActual / elapsedHours;
  const avgEfficiency = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  // Production flow counts
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
      {/* Internal horizontal subnav */}
      <SubNav screen={screen} setScreen={setScreen} criticalAlerts={criticalAlerts} />

      {/* TOP CONTROL BAR */}
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

// ============== Sub-nav ==============
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

// ============== Top Control Bar ==============
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

// ============== Production Flow Panel ==============
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

// ============== Work Centre Load Panel ==============
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
            <div className="font-mono text-xs text-muted-foreground tabular-nums w-20 text-right">
              {r.queued} queued
            </div>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider w-32 justify-center ${toneText[r.badge.tone]} ${toneBg[r.badge.tone]} ${toneBorder[r.badge.tone]}`}>
              {r.badge.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== Live Line Grid ==============
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

      {/* Header */}
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

      {/* WO + material */}
      <div className="px-5 py-3 border-y border-border bg-secondary/40">
        <div className="font-mono text-sm font-semibold text-foreground">{line.woId}</div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {line.material} · {line.gauge} × {line.width}
        </div>
      </div>

      {/* Progress / setup / stoppage */}
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

        {/* Target vs actual */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Target / Actual</span>
          <div className="font-mono text-sm">
            <span className={onPace ? "text-success font-bold" : "text-destructive font-bold"}>
              {line.actualMt.toFixed(1)}
            </span>
            <span className="text-muted-foreground"> / {line.targetMt} MT</span>
          </div>
        </div>

        {/* Coil */}
        <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-border">
          <span className="text-muted-foreground">Coil</span>
          <span className="text-info font-semibold">{line.coilId}</span>
          <span className="text-muted-foreground">@ {line.coilMountedAt}</span>
        </div>
      </div>

      {/* Action buttons */}
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

// ============== KPI Bar ==============
function KpiBar({
  actual,
  target,
  setup,
  downtime,
  rejects,
  scrap,
  rate,
  efficiency,
}: {
  actual: number;
  target: number;
  setup: number;
  downtime: number;
  rejects: number;
  scrap: number;
  rate: number;
  efficiency: number;
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
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{c.label}</div>
          <div className={`mt-1 text-2xl font-bold tracking-tight ${toneText[c.tone]} tabular-nums`}>{c.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ============== Dispatch List ==============
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
                const tone: Tone =
                  j.status === "running" ? "success" : j.status === "setup" ? "info" : j.status === "done" ? "muted" : "muted";
                return (
                  <tr
                    key={j.wo}
                    className={`border-b border-border last:border-0 ${isCurrent ? "bg-accent/10 ring-1 ring-inset ring-accent/30" : ""}`}
                  >
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

// ============== Alerts Panel ==============
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

// ============== KPI Detail ==============
function KpiDetailScreen(props: {
  actual: number;
  target: number;
  setup: number;
  downtime: number;
  rejects: number;
  scrap: number;
  rate: number;
  efficiency: number;
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

// ============== Drill-down ==============
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
      {/* Drill header */}
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

      {/* Control actions */}
      <ControlActions line={line} />

      {/* Dispatch list */}
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
            {jobs.map((j) => {
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

      {/* Two-column timeline + rejects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold">Event timeline</div>
          <div className="p-5 space-y-3">
            {events.map((e, i) => {
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
                {rejects.map((r, i) => (
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

// ============== Control Actions ==============
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
