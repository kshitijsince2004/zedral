import { useMemo, useState } from "react";
import { toneText, toneBg, toneBorder, toneRail, type Tone } from "@/types/common";
import type { DemandWO, WOStatus, Readiness, Priority, FilterState } from "@/types/m1";
import { SEED_WOS } from "@/mocks/m1";
import { TonePill } from "@/components/shared/TonePill";
import { useStore } from "@/state/store";

// ============================================================
// M1 — Demand & Work Order Control
// Converts customer demand into executable work orders and
// validates readiness against M2 master data.
// Light/dark Zedral theme · table-first · drawer detail
// ============================================================

const READINESS_TONE: Record<Readiness, Tone> = { Ready: "success", Partial: "warning", Blocked: "destructive" };
const STATUS_TONE: Record<WOStatus, Tone> = { Pending: "info", Running: "purple", Completed: "muted" };
const PRIORITY_TONE: Record<Priority, Tone> = { High: "destructive", Medium: "warning", Low: "info" };

// ---------------- Derivation ----------------
function readinessOf(w: DemandWO): Readiness {
  const deps = [w.material_exists, w.routing_exists, w.wc_active];
  const missing = deps.filter((d) => !d).length;
  if (missing === 0) return "Ready";
  if (missing === deps.length) return "Blocked";
  return "Partial";
}

function issuesOf(w: DemandWO): { label: string; tone: Tone }[] {
  const out: { label: string; tone: Tone }[] = [];
  if (!w.material_exists) out.push({ label: "Unknown Material", tone: "destructive" });
  if (w.material_exists && !w.routing_exists) out.push({ label: "Missing Routing", tone: "warning" });
  if (!w.wc_active) out.push({ label: "Inactive Work Centre", tone: "destructive" });
  if (!w.operator_assigned) out.push({ label: "Operator Unassigned", tone: "info" });
  return out;
}

function blockReasonOf(w: DemandWO): string | null {
  const reasons: string[] = [];
  if (!w.material_exists) reasons.push("material is not in M2");
  if (w.material_exists && !w.routing_exists) reasons.push("routing rule is missing");
  if (!w.wc_active) reasons.push("work centre is inactive");
  if (reasons.length === 0) return null;
  return `Cannot release: ${reasons.join(" · ")}.`;
}

// Production time estimation (heuristic based on routing assumptions)
function estimateProduction(w: DemandWO): { idealRate: number; setupMin: number; runMin: number; totalMin: number } {
  const idealRate = 18; // MT/hr (matches drawer routing detail)
  const setupMin = 45;
  const runMin = w.routing_exists ? Math.round((w.qty_mt / idealRate) * 60) : 0;
  const totalMin = runMin + setupMin;
  return { idealRate, setupMin, runMin, totalMin };
}

function fmtMin(min: number): string {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const EMPTY_FILTER: FilterState = {
  priority: "all",
  status: "all",
  readiness: "all",
  workCentre: "all",
  customer: "all",
  missing: null,
};

// ============================================================
// Main module
// ============================================================
export function M1Module() {
  const navigateTo = useStore((s) => s.navigateTo);
  const [wos, setWos] = useState<DemandWO[]>(SEED_WOS);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());

  // Enrich with derived readiness
  const enriched = useMemo(
    () => wos.map((w) => ({ ...w, readiness: readinessOf(w) })),
    [wos]
  );

  // ---------- Health metrics ----------
  const health = useMemo(() => {
    const missingMaterial = enriched.filter((w) => !w.material_exists);
    const missingRouting = enriched.filter((w) => w.material_exists && !w.routing_exists);
    const missingWC = enriched.filter((w) => !w.wc_active);
    return { missingMaterial, missingRouting, missingWC };
  }, [enriched]);

  const issuesCount = health.missingMaterial.length + health.missingRouting.length + health.missingWC.length;

  // ---------- KPI ----------
  const kpi = useMemo(() => {
    const total = enriched.length;
    const ready = enriched.filter((w) => w.readiness === "Ready").length;
    const blocked = enriched.filter((w) => w.readiness === "Blocked" || w.readiness === "Partial").length;
    const running = enriched.filter((w) => w.status === "Running").length;
    const completed = enriched.filter((w) => w.status === "Completed").length;
    return { total, ready, blocked, running, completed };
  }, [enriched]);

  // ---------- M1 status ----------
  const m1Status: Readiness =
    kpi.blocked === 0 ? "Ready" : kpi.ready === 0 ? "Blocked" : "Partial";

  // ---------- Work centre load ----------
  const wcLoad = useMemo(() => {
    const map = new Map<string, { active: number; running: number; pending: number; blocked: number; qty: number; wc_active: boolean }>();
    for (const w of enriched) {
      const cur = map.get(w.work_centre) ?? { active: 0, running: 0, pending: 0, blocked: 0, qty: 0, wc_active: w.wc_active };
      if (w.status !== "Completed") cur.active += 1;
      if (w.status === "Running") cur.running += 1;
      if (w.status === "Pending") cur.pending += 1;
      if (w.readiness === "Blocked" || w.readiness === "Partial") cur.blocked += 1;
      cur.qty += w.qty_mt;
      cur.wc_active = cur.wc_active && w.wc_active;
      map.set(w.work_centre, cur);
    }
    return Array.from(map.entries())
      .map(([wc, v]) => ({ wc, ...v }))
      .sort((a, b) => b.active - a.active);
  }, [enriched]);
  const maxLoad = Math.max(1, ...wcLoad.map((w) => w.active));

  // ---------- Filtering ----------
  const filtered = useMemo(() => {
    return enriched.filter((w) => {
      if (filter.priority !== "all" && w.priority !== filter.priority) return false;
      if (filter.status !== "all" && w.status !== filter.status) return false;
      if (filter.readiness !== "all" && w.readiness !== filter.readiness) return false;
      if (filter.workCentre !== "all" && w.work_centre !== filter.workCentre) return false;
      if (filter.customer !== "all" && w.customer !== filter.customer) return false;
      if (filter.missing === "material" && w.material_exists) return false;
      if (filter.missing === "routing" && !(w.material_exists && !w.routing_exists)) return false;
      if (filter.missing === "wc" && w.wc_active) return false;
      return true;
    });
  }, [enriched, filter]);

  const selected = enriched.find((w) => w.wo_id === selectedId) || null;

  const customers = useMemo(() => Array.from(new Set(wos.map((w) => w.customer))).sort(), [wos]);
  const workCentres = useMemo(() => Array.from(new Set(wos.map((w) => w.work_centre))).sort(), [wos]);

  const setKpiFilter = (patch: Partial<FilterState>) => {
    setFilter({ ...EMPTY_FILTER, ...patch });
  };

  const release = (id: string) => {
    setWos((prev) => prev.map((w) => (w.wo_id === id ? { ...w, status: "Running" } : w)));
  };

  // ---------- Bulk selection ----------
  const visibleReadyPendingIds = filtered.filter((w) => w.readiness === "Ready" && w.status === "Pending").map((w) => w.wo_id);
  const toggleBulk = (id: string) => {
    setBulkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearBulk = () => setBulkIds(new Set());
  const bulkReleaseAllReady = () => {
    setWos((prev) =>
      prev.map((w) =>
        readinessOf(w) === "Ready" && w.status === "Pending"
          ? { ...w, status: "Running" }
          : w,
      ),
    );
    clearBulk();
  };
  const bulkReleaseSelected = () => {
    setWos((prev) =>
      prev.map((w) =>
        bulkIds.has(w.wo_id) && readinessOf(w) === "Ready" && w.status === "Pending"
          ? { ...w, status: "Running" }
          : w,
      ),
    );
    clearBulk();
  };

  // ---------- Quick filters ----------
  const isQuickActive = (k: "blocked" | "ready" | "high"): boolean => {
    if (k === "blocked") return filter.readiness === "Blocked";
    if (k === "ready") return filter.readiness === "Ready";
    if (k === "high") return filter.priority === "High";
    return false;
  };
  const toggleQuick = (k: "blocked" | "ready" | "high") => {
    if (k === "blocked") setFilter({ ...EMPTY_FILTER, readiness: filter.readiness === "Blocked" ? "all" : "Blocked" });
    if (k === "ready") setFilter({ ...EMPTY_FILTER, readiness: filter.readiness === "Ready" ? "all" : "Ready" });
    if (k === "high") setFilter({ ...EMPTY_FILTER, priority: filter.priority === "High" ? "all" : "High" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Control Strip */}
      <ControlStrip status={m1Status} totalToday={kpi.total} issues={issuesCount} />

      {/* Demand Health Panel */}
      <DemandHealth
        missingMaterial={health.missingMaterial.length}
        missingRouting={health.missingRouting.length}
        missingWC={health.missingWC.length}
        active={filter.missing}
        onPick={(k) =>
          setFilter({
            ...EMPTY_FILTER,
            missing: filter.missing === k ? null : k,
          })
        }
      />

      {/* KPI Cards */}
      <KpiStrip
        kpi={kpi}
        active={filter}
        onPick={(p) => setKpiFilter(p)}
        onClear={() => setFilter(EMPTY_FILTER)}
      />

      {/* Work centre load + Quick filters */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <WorkCentreLoad rows={wcLoad} maxLoad={maxLoad} active={filter.workCentre} onPick={(wc) => setFilter({ ...EMPTY_FILTER, workCentre: filter.workCentre === wc ? "all" : wc })} />
        <QuickFilters isActive={isQuickActive} onToggle={toggleQuick} />
      </div>

      {/* Filters bar */}
      <FilterBar
        filter={filter}
        setFilter={setFilter}
        customers={customers}
        workCentres={workCentres}
        onClear={() => setFilter(EMPTY_FILTER)}
      />

      {/* Bulk action bar */}
      <BulkBar
        selectedCount={bulkIds.size}
        readyVisibleCount={visibleReadyPendingIds.length}
        onSelectAllReady={() => setBulkIds(new Set(visibleReadyPendingIds))}
        onClear={clearBulk}
        onReleaseSelected={bulkReleaseSelected}
        onReleaseAllReady={bulkReleaseAllReady}
      />

      {/* Main split: Table + Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <WoTable
          wos={filtered}
          selectedId={selectedId}
          bulkIds={bulkIds}
          onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          onToggleBulk={toggleBulk}
          onMaterialClick={(code) => navigateTo({ module: "m2", screen: "materials" })}
        />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {selected ? (
            <WoDrawer
              wo={selected}
              onRelease={() => release(selected.wo_id)}
              onFix={(target) => navigateTo({ module: "m2", screen: target })}
            />
          ) : (
            <EmptyDrawer />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Control Strip
// ============================================================
function ControlStrip({ status, totalToday, issues }: { status: Readiness; totalToday: number; issues: number }) {
  const tone = READINESS_TONE[status];
  const last = "2026-04-20 09:42 IST";
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-1.5 rounded-full ${toneRail[tone]}`} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">M1 Status</div>
            <div className={`text-xl font-bold ${toneText[tone]}`}>{status === "Ready" ? "Ready" : status === "Partial" ? "Partial" : "Not Ready"}</div>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Total Orders Today</div>
          <div className="text-xl font-bold tracking-tight">{totalToday}</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Last Updated</div>
          <div className="text-sm font-mono">{last}</div>
        </div>
        <div className="flex-1" />
        {issues > 0 ? (
          <TonePill tone="warning">⚠ {issues} demand issues</TonePill>
        ) : (
          <TonePill tone="success">✓ All demand validated</TonePill>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Demand Health Panel — sorted by severity with BLOCKER labels
// ============================================================
function DemandHealth({
  missingMaterial,
  missingRouting,
  missingWC,
  active,
  onPick,
}: {
  missingMaterial: number;
  missingRouting: number;
  missingWC: number;
  active: "material" | "routing" | "wc" | null;
  onPick: (k: "material" | "routing" | "wc") => void;
}) {
  type Item = { k: "material" | "routing" | "wc"; label: string; severity: "BLOCKER" | "WARNING"; count: number; tone: Tone; icon: string };
  const items: Item[] = ([
    { k: "material", label: "Orders With Unknown Material", severity: "BLOCKER", count: missingMaterial, tone: "destructive", icon: "✕" },
    { k: "wc", label: "Orders On Inactive Work Centre", severity: "BLOCKER", count: missingWC, tone: "destructive", icon: "■" },
    { k: "routing", label: "Orders Missing Routing", severity: "WARNING", count: missingRouting, tone: "warning", icon: "⚠" },
  ] as Item[]).sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "BLOCKER" ? -1 : 1;
    return b.count - a.count;
  });
  const total = missingMaterial + missingRouting + missingWC;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Demand Health</span>
          {total === 0 ? (
            <TonePill tone="success">All clear</TonePill>
          ) : (
            <TonePill tone="warning">{total} issues · sorted by severity</TonePill>
          )}
        </div>
        <div className="text-xs text-muted-foreground">Click any issue to filter the table</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {items.map((it) => {
          const isActive = active === it.k;
          const disabled = it.count === 0;
          return (
            <button
              key={it.k}
              disabled={disabled}
              onClick={() => onPick(it.k)}
              className={`flex items-start gap-3 px-5 py-4 text-left transition-colors ${
                isActive ? `${toneBg[it.tone]}` : "hover:bg-secondary"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold ${toneBg[it.tone]} ${toneText[it.tone]}`}>
                {it.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${toneBg[it.tone]} ${toneText[it.tone]}`}>
                    {it.severity}
                  </span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{it.label}</div>
                <div className={`mt-0.5 text-2xl font-bold ${it.count > 0 ? toneText[it.tone] : "text-muted-foreground"}`}>{it.count}</div>
              </div>
              {isActive && <TonePill tone={it.tone}>Filtered</TonePill>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// KPI Strip — with flow context subtext
// ============================================================
function KpiStrip({
  kpi,
  active,
  onPick,
  onClear,
}: {
  kpi: { total: number; ready: number; blocked: number; running: number; completed: number };
  active: FilterState;
  onPick: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const allDefault =
    active.priority === "all" && active.status === "all" && active.readiness === "all" &&
    active.workCentre === "all" && active.customer === "all" && active.missing === null;
  const cards: { label: string; value: number; tone: Tone; isActive: boolean; meaning: string; onClick: () => void }[] = [
    { label: "Total Orders", value: kpi.total, tone: "purple", isActive: allDefault, meaning: "All demand", onClick: onClear },
    { label: "Ready Orders", value: kpi.ready, tone: "success", isActive: active.readiness === "Ready", meaning: "Can be released", onClick: () => onPick({ readiness: "Ready" }) },
    { label: "Blocked Orders", value: kpi.blocked, tone: "destructive", isActive: active.readiness === "Blocked", meaning: "Needs action", onClick: () => onPick({ readiness: "Blocked" }) },
    { label: "In Production", value: kpi.running, tone: "info", isActive: active.status === "Running", meaning: "Running load", onClick: () => onPick({ status: "Running" }) },
    { label: "Completed", value: kpi.completed, tone: "muted", isActive: active.status === "Completed", meaning: "Closed today", onClick: () => onPick({ status: "Completed" }) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <button
          key={c.label}
          onClick={c.onClick}
          className={`relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
            c.isActive ? `${toneBorder[c.tone]} ring-2 ring-offset-2 ring-offset-background ring-${c.tone === "muted" ? "border" : c.tone}/40 shadow-md` : "border-border"
          }`}
        >
          <div className={`absolute inset-y-0 left-0 w-1 ${toneRail[c.tone]}`} />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{c.label}</div>
          <div className={`mt-1 text-3xl font-bold tracking-tight ${toneText[c.tone]}`}>{c.value}</div>
          <div className={`mt-1 text-[11px] font-medium ${toneText[c.tone]}`}>{c.meaning}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {c.isActive ? "● Filtering table" : "Click to filter"}
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Work Centre Load
// ============================================================
function WorkCentreLoad({
  rows,
  maxLoad,
  active,
  onPick,
}: {
  rows: { wc: string; active: number; running: number; pending: number; blocked: number; qty: number; wc_active: boolean }[];
  maxLoad: number;
  active: string | "all";
  onPick: (wc: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Work Centre Load</span>
        <span className="text-[11px] text-muted-foreground">Click to filter · identifies overloading</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const pct = (r.active / maxLoad) * 100;
          const overloaded = r.active >= 3;
          const isActive = active === r.wc;
          return (
            <button
              key={r.wc}
              onClick={() => onPick(r.wc)}
              className={`w-full text-left px-5 py-2.5 transition-colors ${isActive ? "bg-accent/10" : "hover:bg-secondary"}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold w-16">{r.wc}</span>
                {!r.wc_active && <TonePill tone="destructive">Inactive</TonePill>}
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full ${overloaded ? "bg-destructive" : r.active >= 2 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono tabular-nums w-20 text-right">
                  <span className="font-bold">{r.active}</span>
                  <span className="text-muted-foreground"> orders</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground w-20 text-right">{r.qty.toFixed(0)} MT</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Quick filter buttons
// ============================================================
function QuickFilters({
  isActive,
  onToggle,
}: {
  isActive: (k: "blocked" | "ready" | "high") => boolean;
  onToggle: (k: "blocked" | "ready" | "high") => void;
}) {
  const items: { k: "blocked" | "ready" | "high"; label: string; tone: Tone; icon: string }[] = [
    { k: "blocked", label: "Blocked Only", tone: "destructive", icon: "✕" },
    { k: "ready", label: "Ready Only", tone: "success", icon: "✓" },
    { k: "high", label: "High Priority Only", tone: "warning", icon: "↑" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Quick Filters</span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {items.map((it) => {
          const on = isActive(it.k);
          return (
            <button
              key={it.k}
              onClick={() => onToggle(it.k)}
              className={`h-10 px-3 rounded-md border text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                on ? `${toneBg[it.tone]} ${toneText[it.tone]} ${toneBorder[it.tone]}` : "border-input text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="text-base">{it.icon}</span>
              <span>{it.label}</span>
              {on && <span className="ml-auto text-[10px]">● ON</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Bulk action bar
// ============================================================
function BulkBar({
  selectedCount,
  readyVisibleCount,
  onSelectAllReady,
  onClear,
  onReleaseSelected,
  onReleaseAllReady,
}: {
  selectedCount: number;
  readyVisibleCount: number;
  onSelectAllReady: () => void;
  onClear: () => void;
  onReleaseSelected: () => void;
  onReleaseAllReady: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-3 flex items-center gap-3 flex-wrap">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Bulk Actions</span>
      <span className="text-xs text-muted-foreground">
        {selectedCount > 0 ? (
          <><span className="font-bold text-foreground">{selectedCount}</span> selected</>
        ) : (
          <>Tick rows in the table to select, or use shortcuts below</>
        )}
      </span>
      <div className="flex-1" />
      <button
        onClick={onSelectAllReady}
        disabled={readyVisibleCount === 0}
        className="h-8 px-3 rounded-md border border-input text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Select all ready ({readyVisibleCount})
      </button>
      {selectedCount > 0 && (
        <button
          onClick={onClear}
          className="h-8 px-3 rounded-md border border-input text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          Clear
        </button>
      )}
      <button
        onClick={onReleaseSelected}
        disabled={selectedCount === 0}
        className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-success text-success-foreground hover:bg-success/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
      >
        ▶ Release Selected
      </button>
      <button
        onClick={onReleaseAllReady}
        className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wider border border-success/40 text-success hover:bg-success/10"
      >
        ▶▶ Release ALL Ready
      </button>
    </div>
  );
}

// ============================================================
// Filter Bar
// ============================================================
function FilterBar({
  filter,
  setFilter,
  customers,
  workCentres,
  onClear,
}: {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  customers: string[];
  workCentres: string[];
  onClear: () => void;
}) {
  const baseSelect =
    "h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";
  const dirty =
    filter.priority !== "all" ||
    filter.status !== "all" ||
    filter.readiness !== "all" ||
    filter.workCentre !== "all" ||
    filter.customer !== "all" ||
    filter.missing !== null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm px-5 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Filters</span>

      <select className={baseSelect} value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value as FilterState["priority"] })}>
        <option value="all">Priority: All</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <select className={baseSelect} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as FilterState["status"] })}>
        <option value="all">Status: All</option>
        <option value="Pending">Pending</option>
        <option value="Running">Running</option>
        <option value="Completed">Completed</option>
      </select>

      <select className={baseSelect} value={filter.readiness} onChange={(e) => setFilter({ ...filter, readiness: e.target.value as FilterState["readiness"] })}>
        <option value="all">Readiness: All</option>
        <option value="Ready">Ready</option>
        <option value="Partial">Partial</option>
        <option value="Blocked">Blocked</option>
      </select>

      <select className={baseSelect} value={filter.workCentre} onChange={(e) => setFilter({ ...filter, workCentre: e.target.value })}>
        <option value="all">Work Centre: All</option>
        {workCentres.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>

      <select className={baseSelect} value={filter.customer} onChange={(e) => setFilter({ ...filter, customer: e.target.value })}>
        <option value="all">Customer: All</option>
        {customers.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <div className="flex-1" />

      {dirty && (
        <button
          onClick={onClear}
          className="h-9 px-3 rounded-md border border-input text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          × Clear all
        </button>
      )}
    </div>
  );
}

// ============================================================
// Work Order Table
// ============================================================
function WoTable({
  wos,
  selectedId,
  bulkIds,
  onSelect,
  onToggleBulk,
  onMaterialClick,
}: {
  wos: (DemandWO & { readiness: Readiness })[];
  selectedId: string | null;
  bulkIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleBulk: (id: string) => void;
  onMaterialClick: (code: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Work Orders <span className="ml-1 text-foreground font-bold">({wos.length})</span>
        </span>
        <span className="text-[11px] text-muted-foreground">Tick to bulk-release · click row for details</span>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 w-8" />
              {["WO ID", "Customer", "Material", "Qty (MT)", "Work Centre", "Priority", "Status", "Readiness", "Issue", "Due", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wos.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No work orders match the current filters.
                </td>
              </tr>
            )}
            {wos.map((w) => {
              const sel = selectedId === w.wo_id;
              const checked = bulkIds.has(w.wo_id);
              const canBulk = w.readiness === "Ready" && w.status === "Pending";
              const rowTint =
                w.readiness === "Blocked"
                  ? "bg-destructive/5 border-l-2 border-l-destructive"
                  : w.readiness === "Partial"
                  ? "bg-warning/5 border-l-2 border-l-warning"
                  : "border-l-2 border-l-success/40";
              const issues = issuesOf(w);
              return (
                <tr
                  key={w.wo_id}
                  onClick={() => onSelect(w.wo_id)}
                  className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                    sel ? "bg-accent/10 border-l-2 border-l-accent" : `hover:bg-secondary ${rowTint}`
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canBulk}
                      onChange={() => onToggleBulk(w.wo_id)}
                      className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 accent-success"
                      title={canBulk ? "Select for bulk release" : "Only Ready + Pending orders can be bulk-released"}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">{w.wo_id}</td>
                  <td className="px-3 py-2.5">{w.customer}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    {w.material_exists ? (
                      w.material_code
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMaterialClick(w.material_code);
                        }}
                        className="text-destructive font-bold hover:underline text-left"
                        title="Click to open M2 → Materials"
                      >
                        Unknown Material (Not in M2) →
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{w.qty_mt.toFixed(1)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {w.work_centre}{" "}
                    {!w.wc_active && <span className="text-destructive text-[10px]">(inactive)</span>}
                  </td>
                  <td className="px-3 py-2.5"><TonePill tone={PRIORITY_TONE[w.priority]}>{w.priority}</TonePill></td>
                  <td className="px-3 py-2.5"><TonePill tone={STATUS_TONE[w.status]}>{w.status}</TonePill></td>
                  <td className="px-3 py-2.5"><TonePill tone={READINESS_TONE[w.readiness]}>{w.readiness}</TonePill></td>
                  <td className="px-3 py-2.5">
                    {issues.length === 0 ? (
                      <span className="text-[11px] text-success font-semibold">✓ None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {issues.map((iss) => (
                          <span key={iss.label} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${toneBg[iss.tone]} ${toneText[iss.tone]}`}>
                            {iss.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{w.due_date}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(w.wo_id);
                      }}
                      className="px-2 py-0.5 rounded-md border border-input text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      Inspect
                    </button>
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

// ============================================================
// Drawer
// ============================================================
function WoDrawer({
  wo,
  onRelease,
  onFix,
}: {
  wo: DemandWO & { readiness: Readiness };
  onRelease: () => void;
  onFix: (target: "materials" | "routing" | "workcentres") => void;
}) {
  const checklist: { ok: boolean; label: string; fix?: "materials" | "routing" | "workcentres" }[] = [
    { ok: wo.material_exists, label: "Material exists in M2", fix: "materials" },
    { ok: wo.routing_exists, label: "Routing rule defined", fix: "routing" },
    { ok: wo.wc_active, label: "Work centre active", fix: "workcentres" },
    { ok: wo.operator_assigned, label: "Operator assigned" },
  ];
  const canRelease = wo.readiness === "Ready" && wo.status === "Pending";
  const blockReason = blockReasonOf(wo);
  const est = estimateProduction(wo);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Work Order</div>
        <div className="mt-1 font-mono text-lg font-bold tracking-tight">{wo.wo_id}</div>
        <div className="mt-1 text-sm">{wo.customer}</div>
        <div className="text-xs font-mono text-muted-foreground break-all">{wo.material_code}</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <TonePill tone={READINESS_TONE[wo.readiness]}>{wo.readiness}</TonePill>
          <TonePill tone={STATUS_TONE[wo.status]}>{wo.status}</TonePill>
          <TonePill tone={PRIORITY_TONE[wo.priority]}>{wo.priority}</TonePill>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-border space-y-2">
        <Row k="Quantity" v={`${wo.qty_mt.toFixed(1)} MT`} />
        <Row k="Work Centre" v={wo.work_centre} />
        <Row k="Due Date" v={wo.due_date} />
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Routing Details</div>
        {wo.routing_exists ? (
          <div className="space-y-1.5 text-xs font-mono">
            <Row k="Material → WC" v={`${wo.material_code.split("-").slice(0, 2).join("-")} → ${wo.work_centre}`} />
            <Row k="Ideal Rate" v="18 MT/hr" />
            <Row k="Setup Time" v="45 min" />
            <Row k="Yield" v="96%" />
          </div>
        ) : (
          <div className="text-xs text-destructive italic">No routing rule found in M2.</div>
        )}
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Production Time Estimate</div>
        {wo.routing_exists ? (
          <div className="space-y-1.5">
            <Row k="Ideal Rate" v={`${est.idealRate} MT/hr`} />
            <Row k="Quantity" v={`${wo.qty_mt.toFixed(1)} MT`} />
            <Row k="Run Time" v={fmtMin(est.runMin)} />
            <Row k="Setup Time" v={fmtMin(est.setupMin)} />
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-foreground">Total Time</span>
                <span className="font-mono font-bold text-success">{fmtMin(est.totalMin)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">Cannot estimate — routing missing.</div>
        )}
      </div>

      <div className="px-5 py-4 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Validation Checklist</div>
        <ul className="space-y-1.5">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${c.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                {c.ok ? "✓" : "✕"}
              </span>
              <span className={c.ok ? "text-foreground flex-1" : "text-destructive flex-1"}>{c.label}</span>
              {!c.ok && c.fix && (
                <button
                  onClick={() => onFix(c.fix!)}
                  className="text-[10px] font-semibold uppercase tracking-wider text-info hover:underline"
                >
                  Fix in M2 →
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 py-4 mt-auto flex flex-col gap-2">
        <button
          disabled={!canRelease}
          onClick={onRelease}
          className={`h-10 rounded-md text-sm font-semibold transition-colors ${
            canRelease
              ? "bg-success text-success-foreground hover:bg-success/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {wo.status === "Running"
            ? "▶ Released to Production"
            : wo.status === "Completed"
            ? "✓ Completed"
            : canRelease
            ? "▶ Release to Production"
            : "✕ Cannot Release — fix issues"}
        </button>
        {!canRelease && wo.status === "Pending" && blockReason && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-[11px] text-destructive font-medium">{blockReason}</p>
          </div>
        )}
        {!canRelease && wo.status === "Pending" && !blockReason && (
          <p className="text-[11px] text-muted-foreground">
            Release is enabled only when readiness is <span className="text-success font-semibold">Ready</span>.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono font-semibold text-foreground">{v}</span>
    </div>
  );
}

function EmptyDrawer() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-8 min-h-[400px]">
      <div className="text-5xl opacity-30">▤</div>
      <div className="text-sm text-center">Select a work order to inspect &amp; release</div>
    </div>
  );
}
