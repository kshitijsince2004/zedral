import { useMemo, useRef, useState } from "react";

// ============================================================
// M2 Extension Screens — adapted to the existing light Zedral
// theme. All visuals use semantic tokens (no hardcoded colors).
//   1. GradesScreen           — Material Grades catalogue
//   2. ShiftCalendarScreen    — Monthly calendar grid per WC
//   3. ChangeoverMatrixScreen — Setup-time heatmap
//   4. CsvImportScreen        — 4-step CSV ingestion pipeline
// ============================================================

// ------------ Shared local primitives ------------
function SectionHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
        {sub && <div className="text-sm text-foreground mt-0.5">{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "info" | "destructive" | "muted" | "purple" | "accent";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    success: "text-success bg-success/10 border-success/30",
    warning: "text-warning bg-warning/15 border-warning/40",
    info: "text-info bg-info/10 border-info/30",
    destructive: "text-destructive bg-destructive/10 border-destructive/30",
    muted: "text-muted-foreground bg-muted border-border",
    purple: "text-purple bg-purple/10 border-purple/30",
    accent: "text-accent-foreground bg-accent/30 border-accent/50",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

function GhostBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// 1. GRADES SCREEN — Material Grades catalogue
// ============================================================
type GradeFamily = "CR" | "HR" | "GP" | "SS" | "EG";
interface Grade {
  code: string;
  description: string;
  family: GradeFamily;
  thickness_min: number;
  thickness_max: number;
  width_min: number;
  width_max: number;
  tensile_max?: number;
  yield_max?: number;
  applications: string[];
  is_standard: string;
  equivalent?: string;
  is_active: boolean;
  updated_at: string;
}

const SEED_GRADES: Grade[] = [
  {
    code: "IS513-CR1",
    description: "CR Full Hard",
    family: "CR",
    thickness_min: 0.5,
    thickness_max: 2.0,
    width_min: 600,
    width_max: 1250,
    tensile_max: 550,
    yield_max: 410,
    applications: ["automotive", "white goods"],
    is_standard: "IS 513:2008",
    equivalent: "DC01 / SPCC",
    is_active: true,
    updated_at: "2026-04-18",
  },
  {
    code: "IS513-CR2",
    description: "CR Half Hard",
    family: "CR",
    thickness_min: 0.5,
    thickness_max: 2.5,
    width_min: 600,
    width_max: 1250,
    tensile_max: 490,
    applications: ["automotive", "CRCA"],
    is_standard: "IS 513:2008",
    is_active: true,
    updated_at: "2026-04-15",
  },
  {
    code: "IS513-CR3",
    description: "CR Quarter Hard",
    family: "CR",
    thickness_min: 0.5,
    thickness_max: 3.0,
    width_min: 600,
    width_max: 1250,
    tensile_max: 410,
    applications: ["white goods"],
    is_standard: "IS 513:2008",
    is_active: true,
    updated_at: "2026-04-10",
  },
  {
    code: "IS513-CR4",
    description: "CR Skin Passed",
    family: "CR",
    thickness_min: 0.5,
    thickness_max: 2.5,
    width_min: 600,
    width_max: 1250,
    tensile_max: 380,
    applications: ["furniture", "panels"],
    is_standard: "IS 513:2008",
    is_active: true,
    updated_at: "2026-04-09",
  },
  {
    code: "DC01",
    description: "Cold Reduced General",
    family: "CR",
    thickness_min: 0.4,
    thickness_max: 3.0,
    width_min: 600,
    width_max: 1500,
    tensile_max: 410,
    applications: ["general", "panels"],
    is_standard: "EN 10130",
    is_active: true,
    updated_at: "2026-04-12",
  },
  {
    code: "DC04",
    description: "Cold Reduced Drawing",
    family: "CR",
    thickness_min: 0.4,
    thickness_max: 2.5,
    width_min: 600,
    width_max: 1500,
    tensile_max: 380,
    applications: ["deep drawing"],
    is_standard: "EN 10130",
    is_active: true,
    updated_at: "2026-04-12",
  },
  {
    code: "SPCC",
    description: "CR Commercial",
    family: "CR",
    thickness_min: 0.4,
    thickness_max: 3.2,
    width_min: 600,
    width_max: 1500,
    tensile_max: 410,
    applications: ["commercial"],
    is_standard: "JIS G3141",
    is_active: true,
    updated_at: "2026-04-08",
  },
  {
    code: "HR-HB",
    description: "Hot Band Feedstock",
    family: "HR",
    thickness_min: 1.5,
    thickness_max: 6.0,
    width_min: 600,
    width_max: 1500,
    tensile_max: 540,
    applications: ["feedstock"],
    is_standard: "IS 10748",
    is_active: true,
    updated_at: "2026-04-19",
  },
];

const FAMILY_TONE: Record<GradeFamily, "info" | "warning" | "success" | "purple" | "muted"> = {
  CR: "info",
  HR: "warning",
  GP: "info",
  SS: "purple",
  EG: "success",
};

export function GradesScreen({ materials }: { materials?: { material_code: string }[] }) {
  const [rows, setRows] = useState<Grade[]>(SEED_GRADES);
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<GradeFamily | "all">("all");
  const [editing, setEditing] = useState<Grade | null>(null);

  const filtered = rows.filter((g) => {
    if (familyFilter !== "all" && g.family !== familyFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !g.code.toLowerCase().includes(s) &&
        !g.description.toLowerCase().includes(s) &&
        !g.applications.join(" ").toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const families = useMemo(() => Array.from(new Set(rows.map((r) => r.family))), [rows]);
  const lastUpdated = useMemo(
    () =>
      rows
        .map((r) => r.updated_at)
        .sort()
        .pop() ?? "—",
    [rows],
  );
  const linkedToInventory = materials?.length ?? 0;

  const toggleActive = (code: string) =>
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, is_active: !r.is_active } : r)),
    );

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Total Grades
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Grade Families
          </div>
          <div className="text-2xl font-bold text-info mt-1">{families.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Linked Inventory
          </div>
          <div className="text-2xl font-bold text-success mt-1">{linkedToInventory}</div>
          <div className="text-[10px] text-muted-foreground">materials referencing grades</div>
        </Card>
        <Card className="p-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Last Updated
          </div>
          <div className="text-lg font-semibold text-foreground mt-1 font-mono">
            {lastUpdated}
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <input
          placeholder="Search grade / description / application…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value as GradeFamily | "all")}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="all">All families</option>
          {families.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <PrimaryBtn onClick={() => setEditing({ ...EMPTY_GRADE })}>＋ Add Grade</PrimaryBtn>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <SectionHeader
          title="Material Grades · Steel Catalogue"
          sub={`${filtered.length} of ${rows.length} grades shown`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-y border-border">
                <th className="text-left px-4 py-2">Grade Code</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">Family</th>
                <th className="text-left px-4 py-2">Thickness</th>
                <th className="text-left px-4 py-2">Width</th>
                <th className="text-left px-4 py-2">Tensile</th>
                <th className="text-left px-4 py-2">Applications</th>
                <th className="text-center px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr
                  key={g.code}
                  onClick={() => setEditing(g)}
                  className="border-b border-border hover:bg-secondary/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                    {g.code}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{g.description}</td>
                  <td className="px-4 py-2.5">
                    <Pill tone={FAMILY_TONE[g.family]}>{g.family}</Pill>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {g.thickness_min} – {g.thickness_max} mm
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {g.width_min} – {g.width_max} mm
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {g.tensile_max ? `≤ ${g.tensile_max} MPa` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {g.applications.map((a) => (
                        <span
                          key={a}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    className="px-4 py-2.5 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(g.code);
                    }}
                  >
                    <span
                      className={`inline-block w-9 h-5 rounded-full relative transition ${
                        g.is_active ? "bg-success" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition ${
                          g.is_active ? "left-4" : "left-0.5"
                        }`}
                      />
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    No grades match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <GradeDrawer
          grade={editing}
          isNew={!rows.find((r) => r.code === editing.code)}
          onClose={() => setEditing(null)}
          onSave={(g) => {
            setRows((prev) => {
              const exists = prev.find((r) => r.code === g.code);
              return exists
                ? prev.map((r) => (r.code === g.code ? g : r))
                : [...prev, g];
            });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const EMPTY_GRADE: Grade = {
  code: "",
  description: "",
  family: "CR",
  thickness_min: 0.5,
  thickness_max: 2.0,
  width_min: 600,
  width_max: 1250,
  applications: [],
  is_standard: "",
  is_active: true,
  updated_at: new Date().toISOString().slice(0, 10),
};

function GradeDrawer({
  grade,
  isNew,
  onClose,
  onSave,
}: {
  grade: Grade;
  isNew: boolean;
  onClose: () => void;
  onSave: (g: Grade) => void;
}) {
  const [draft, setDraft] = useState<Grade>(grade);
  const [tagInput, setTagInput] = useState("");

  const upd = <K extends keyof Grade>(k: K, v: Grade[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[380px] h-full bg-card border-l border-border shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {isNew ? "New Grade" : "Edit Grade"}
            </div>
            <div className="text-sm font-semibold">{draft.code || "—"}</div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <Field label="Grade Code">
            <input
              value={draft.code}
              disabled={!isNew}
              onChange={(e) => upd("code", e.target.value.toUpperCase())}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono disabled:opacity-60"
            />
          </Field>
          <Field label="Description">
            <input
              value={draft.description}
              onChange={(e) => upd("description", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </Field>
          <Field label="Family">
            <select
              value={draft.family}
              onChange={(e) => upd("family", e.target.value as GradeFamily)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {(["CR", "HR", "GP", "SS", "EG"] as GradeFamily[]).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Thick. min (mm)">
              <input
                type="number"
                step={0.1}
                value={draft.thickness_min}
                onChange={(e) => upd("thickness_min", parseFloat(e.target.value) || 0)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
              />
            </Field>
            <Field label="Thick. max (mm)">
              <input
                type="number"
                step={0.1}
                value={draft.thickness_max}
                onChange={(e) => upd("thickness_max", parseFloat(e.target.value) || 0)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
              />
            </Field>
            <Field label="Width min (mm)">
              <input
                type="number"
                value={draft.width_min}
                onChange={(e) => upd("width_min", parseInt(e.target.value) || 0)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
              />
            </Field>
            <Field label="Width max (mm)">
              <input
                type="number"
                value={draft.width_max}
                onChange={(e) => upd("width_max", parseInt(e.target.value) || 0)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
              />
            </Field>
            <Field label="Tensile max (MPa)">
              <input
                type="number"
                value={draft.tensile_max ?? ""}
                onChange={(e) => upd("tensile_max", parseInt(e.target.value) || undefined)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
              />
            </Field>
            <Field label="Yield max (MPa)">
              <input
                type="number"
                value={draft.yield_max ?? ""}
                onChange={(e) => upd("yield_max", parseInt(e.target.value) || undefined)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
              />
            </Field>
          </div>
          <Field label="IS Standard">
            <input
              value={draft.is_standard}
              onChange={(e) => upd("is_standard", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </Field>
          <Field label="Equivalent Standards">
            <input
              value={draft.equivalent ?? ""}
              onChange={(e) => upd("equivalent", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </Field>
          <Field label="Applications">
            <div className="flex flex-wrap gap-1 mb-2">
              {draft.applications.map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground inline-flex items-center gap-1"
                >
                  {a}
                  <button
                    onClick={() =>
                      upd(
                        "applications",
                        draft.applications.filter((x) => x !== a),
                      )
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  upd("applications", [...draft.applications, tagInput.trim()]);
                  setTagInput("");
                }
              }}
              placeholder="Type and press Enter…"
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </Field>
          <Field label="Active">
            <button
              onClick={() => upd("is_active", !draft.is_active)}
              className={`inline-block w-11 h-6 rounded-full relative transition ${
                draft.is_active ? "bg-success" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition ${
                  draft.is_active ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </Field>

          <div className="flex gap-2 mt-3">
            <PrimaryBtn onClick={() => onSave({ ...draft, updated_at: new Date().toISOString().slice(0, 10) })}>
              {isNew ? "Create Grade" : "Save Changes"}
            </PrimaryBtn>
            <GhostBtn onClick={onClose}>Discard</GhostBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ============================================================
// 2. SHIFT CALENDAR — month grid per work centre
// ============================================================
interface ShiftLite {
  id: string;
  name: string;
  start: string;
  end: string;
  linked_wcs: string[];
}
interface WorkCentreLite {
  wc_id: string;
  name: string;
  status: "active" | "inactive";
}

interface DayMeta {
  isHoliday?: boolean;
  shutdownReason?: string;
  pmHours?: number;
  patternId?: string;
}

export function ShiftCalendarScreen({
  shifts,
  workCentres,
}: {
  shifts: ShiftLite[];
  workCentres: WorkCentreLite[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedWc, setSelectedWc] = useState<string>(
    workCentres.find((w) => w.status === "active")?.wc_id ?? workCentres[0]?.wc_id ?? "",
  );
  const [dayMeta, setDayMeta] = useState<Record<string, DayMeta>>({});
  const [popover, setPopover] = useState<{ key: string; date: Date } | null>(null);

  const monthName = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Build cells: Monday-first
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date | null; key: string }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: `pad-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, key: `${year}-${month}-${d}-${selectedWc}` });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, key: `pad-end-${cells.length}` });

  const wcShifts = shifts.filter((s) => s.linked_wcs.includes(selectedWc));
  const baseHours = useMemo(() => {
    return wcShifts.reduce((sum, s) => {
      const [h1, m1] = s.start.split(":").map(Number);
      const [h2, m2] = s.end.split(":").map(Number);
      let mins = h2 * 60 + m2 - (h1 * 60 + m1);
      if (mins <= 0) mins += 24 * 60;
      return sum + mins / 60;
    }, 0);
  }, [wcShifts]);

  const goPrev = () => {
    const m = month - 1;
    if (m < 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(m);
  };
  const goNext = () => {
    const m = month + 1;
    if (m > 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(m);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const toggleHoliday = (key: string) =>
    setDayMeta((p) => ({
      ...p,
      [key]: { ...(p[key] || {}), isHoliday: !p[key]?.isHoliday },
    }));

  return (
    <div className="flex flex-col gap-4">
      {/* Pattern strip */}
      <Card className="p-4">
        <SectionHeader
          title="Shift Patterns · CRS Plant"
          sub={`${shifts.length} pattern${shifts.length === 1 ? "" : "s"} defined · base capacity ${baseHours.toFixed(1)} h/day`}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {shifts.map((s) => {
            const tone =
              s.name === "A" ? "info" : s.name === "B" ? "warning" : "purple";
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-3 flex items-center justify-between bg-card border-l-4 border-${tone === "info" ? "info" : tone === "warning" ? "warning" : "purple"} border-y-border border-r-border`}
              >
                <div>
                  <div className="text-sm font-semibold">Shift {s.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {s.start} → {s.end}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.linked_wcs.map((w) => (
                    <span
                      key={w}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Work centre selector */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-2">
          Work Centre
        </span>
        {workCentres.map((w) => (
          <GhostBtn
            key={w.wc_id}
            active={selectedWc === w.wc_id}
            onClick={() => setSelectedWc(w.wc_id)}
          >
            {w.wc_id}
          </GhostBtn>
        ))}
      </Card>

      {/* Calendar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GhostBtn onClick={goPrev}>‹</GhostBtn>
            <div className="text-sm font-bold uppercase tracking-wider min-w-[140px] text-center">
              {monthName}
            </div>
            <GhostBtn onClick={goNext}>›</GhostBtn>
            <GhostBtn onClick={goToday}>Today</GhostBtn>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" /> Active
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive" /> Shutdown
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning" /> PM Window
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-center pb-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 relative">
          {cells.map((c) => {
            if (!c.date)
              return (
                <div
                  key={c.key}
                  className="min-h-[80px] rounded-md bg-secondary/30 border border-dashed border-border"
                />
              );
            const isToday =
              c.date.toDateString() === today.toDateString();
            const meta = dayMeta[c.key] || {};
            const dow = c.date.getDay();
            const hasShift = wcShifts.length > 0 && dow !== 0;
            return (
              <button
                key={c.key}
                onClick={() => setPopover({ key: c.key, date: c.date! })}
                className={`relative min-h-[80px] rounded-md border text-left p-1.5 transition-all hover:bg-secondary/60 ${
                  meta.isHoliday
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-card border-border"
                } ${isToday ? "ring-2 ring-accent" : ""}`}
              >
                {hasShift && !meta.isHoliday && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-md bg-success" />
                )}
                <div
                  className={`text-[11px] font-mono ${
                    isToday ? "text-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  {c.date.getDate()}
                </div>
                {meta.isHoliday && (
                  <div className="absolute top-1 right-1 text-[8px] uppercase tracking-wider text-destructive font-semibold">
                    SHUTDOWN
                  </div>
                )}
                {meta.pmHours && !meta.isHoliday && (
                  <div className="absolute bottom-1 left-1 right-1 bg-warning/30 text-[9px] text-warning font-mono px-1 rounded">
                    PM {meta.pmHours}h
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {popover && (
        <DayPopover
          date={popover.date}
          meta={dayMeta[popover.key] || {}}
          baseHours={baseHours}
          patterns={wcShifts.map((s) => s.name).join(", ") || "None assigned"}
          onClose={() => setPopover(null)}
          onToggleHoliday={() => toggleHoliday(popover.key)}
          onAddPm={(hours) =>
            setDayMeta((p) => ({
              ...p,
              [popover.key]: { ...(p[popover.key] || {}), pmHours: hours },
            }))
          }
        />
      )}
    </div>
  );
}

function DayPopover({
  date,
  meta,
  baseHours,
  patterns,
  onClose,
  onToggleHoliday,
  onAddPm,
}: {
  date: Date;
  meta: DayMeta;
  baseHours: number;
  patterns: string;
  onClose: () => void;
  onToggleHoliday: () => void;
  onAddPm: (h: number) => void;
}) {
  const [pmH, setPmH] = useState(meta.pmHours ?? 2);
  const available = meta.isHoliday ? 0 : Math.max(0, baseHours - (meta.pmHours ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[340px] bg-card rounded-2xl border border-border shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Day Detail
            </div>
            <div className="text-sm font-bold">
              {date.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <Row label="Applied Pattern" value={patterns} mono={false} />
          <Row label="Available Hours" value={`${available.toFixed(1)} h`} mono />

          <div className="flex items-center justify-between py-2 border-t border-border mt-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Mark as Holiday / Shutdown
            </span>
            <button
              onClick={onToggleHoliday}
              className={`inline-block w-11 h-6 rounded-full relative transition ${
                meta.isHoliday ? "bg-destructive" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition ${
                  meta.isHoliday ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-border pt-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              + Add PM Window
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={0.5}
                min={0}
                max={baseHours}
                value={pmH}
                onChange={(e) => setPmH(parseFloat(e.target.value) || 0)}
                className="w-20 h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">hours</span>
              <PrimaryBtn onClick={() => onAddPm(pmH)}>Save</PrimaryBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ============================================================
// 3. CHANGEOVER MATRIX — heatmap of setup minutes
// ============================================================
type DataSource = "MEASURED" | "ESTIMATED" | "DEFAULT";
interface MatrixCell {
  minutes: number | null;
  notes?: string;
  source?: DataSource;
  updated_at?: string;
}

const MATRIX_GRADES = [
  "IS513-CR1",
  "IS513-CR2",
  "IS513-CR3",
  "IS513-CR4",
  "DC01",
  "DC04",
  "SPCC",
  "HR-HB",
];

const SEED_MATRIX: Record<string, MatrixCell> = {
  "IS513-CR1>IS513-CR4": { minutes: 25, source: "MEASURED", notes: "Skin pass adj.", updated_at: "2026-04-12" },
  "IS513-CR1>DC04": { minutes: 45, source: "MEASURED", notes: "Roll change + prep", updated_at: "2026-04-10" },
  "DC04>IS513-CR1": { minutes: 55, source: "MEASURED", notes: "Reverse harder", updated_at: "2026-04-09" },
  "DC04>DC01": { minutes: 20, source: "MEASURED", notes: "Same family", updated_at: "2026-04-15" },
  "HR-HB>IS513-CR1": { minutes: 90, source: "MEASURED", notes: "Full roll change", updated_at: "2026-04-08" },
  "IS513-CR2>IS513-CR3": { minutes: 18, source: "ESTIMATED", updated_at: "2026-04-05" },
  "IS513-CR3>IS513-CR2": { minutes: 22, source: "ESTIMATED", updated_at: "2026-04-05" },
  "DC01>SPCC": { minutes: 28, source: "ESTIMATED", updated_at: "2026-04-05" },
  "SPCC>DC01": { minutes: 30, source: "ESTIMATED", updated_at: "2026-04-05" },
  "IS513-CR1>SPCC": { minutes: 38, source: "DEFAULT", updated_at: "2026-04-01" },
};

function colorForMinutes(min: number | null): string {
  if (min === null) return "transparent";
  // 0=success(green) → 60=warning(amber) → 120=destructive(red)
  if (min <= 0) return "var(--success)";
  if (min <= 30) {
    // green → amber/2
    return `color-mix(in oklch, var(--success), var(--warning) ${(min / 30) * 50}%)`;
  }
  if (min <= 60) {
    return `color-mix(in oklch, var(--warning), var(--warning) ${((min - 30) / 30) * 30}%)`;
  }
  if (min <= 120) {
    return `color-mix(in oklch, var(--warning), var(--destructive) ${((min - 60) / 60) * 80}%)`;
  }
  return "var(--destructive)";
}

export function ChangeoverMatrixScreen() {
  const [wc, setWc] = useState("CRS-1");
  const [matrix, setMatrix] = useState<Record<string, MatrixCell>>(SEED_MATRIX);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null);

  const grades = MATRIX_GRADES.filter((g) =>
    filter ? g.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  const totalCells = MATRIX_GRADES.length * (MATRIX_GRADES.length - 1);
  const populated = Object.values(matrix).filter((c) => c.minutes !== null).length;
  const coverage = Math.round((populated / totalCells) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-2">
          Work Centre
        </span>
        {["CRS-1", "CRS-2", "CRS-3"].map((w) => (
          <GhostBtn key={w} active={wc === w} onClick={() => setWc(w)}>
            {w}
          </GhostBtn>
        ))}
        <input
          placeholder="Filter grades…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-[200px]"
        />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Setup Min
          </span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background:
                "linear-gradient(90deg, var(--success) 0%, var(--warning) 50%, var(--destructive) 100%)",
            }}
          />
          <span className="text-[10px] font-mono text-muted-foreground">0 · 60 · 120+</span>
        </div>
      </Card>

      {/* Matrix */}
      <Card className="p-4 overflow-x-auto">
        <SectionHeader
          title={`Changeover Matrix · ${wc} Setup Times`}
          sub="Click a cell to edit · diagonal = same grade (0 min)"
        />
        <div className="inline-block min-w-full">
          <table className="border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th className="w-20" />
                {grades.map((g) => (
                  <th key={g} className="w-10 h-20 align-bottom">
                    <div className="origin-bottom-left -rotate-45 text-[9px] font-mono text-muted-foreground whitespace-nowrap pl-2">
                      {g}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map((from) => (
                <tr key={from}>
                  <td className="w-20 pr-2 text-right text-[10px] font-mono font-semibold text-foreground">
                    {from}
                  </td>
                  {grades.map((to) => {
                    const key = `${from}>${to}`;
                    const cell = matrix[key];
                    const isDiag = from === to;
                    const min = isDiag ? 0 : cell?.minutes ?? null;
                    const bg = isDiag
                      ? "color-mix(in oklch, var(--accent), transparent 70%)"
                      : min === null
                        ? "color-mix(in oklch, var(--muted), transparent 50%)"
                        : colorForMinutes(min);
                    return (
                      <td key={to} className="p-0">
                        <button
                          title={`${from} → ${to}${min !== null ? ` · ${min} min` : " · no data"}`}
                          onClick={() => !isDiag && setEditing({ from, to })}
                          className="w-9 h-9 text-[9px] font-mono font-semibold rounded transition-transform hover:scale-110 hover:ring-2 hover:ring-accent flex items-center justify-center"
                          style={{
                            background: bg,
                            color:
                              isDiag
                                ? "var(--accent-foreground)"
                                : min === null
                                  ? "var(--muted-foreground)"
                                  : min > 60
                                    ? "var(--card)"
                                    : "var(--foreground)",
                          }}
                        >
                          {isDiag ? "0" : min === null ? "—" : min}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Coverage */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Matrix Coverage · {coverage}% Populated
          </div>
          <div className="text-[10px] text-muted-foreground">
            {totalCells - populated} cells missing data
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${coverage}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <GhostBtn>Export CSV</GhostBtn>
          <PrimaryBtn>Import CSV</PrimaryBtn>
        </div>
      </Card>

      {editing && (
        <CellEditor
          from={editing.from}
          to={editing.to}
          cell={matrix[`${editing.from}>${editing.to}`]}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            setMatrix((p) => ({ ...p, [`${editing.from}>${editing.to}`]: c }));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CellEditor({
  from,
  to,
  cell,
  onClose,
  onSave,
}: {
  from: string;
  to: string;
  cell?: MatrixCell;
  onClose: () => void;
  onSave: (c: MatrixCell) => void;
}) {
  const [minutes, setMinutes] = useState<number>(cell?.minutes ?? 35);
  const [notes, setNotes] = useState(cell?.notes ?? "");
  const [source, setSource] = useState<DataSource>(cell?.source ?? "ESTIMATED");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[300px] bg-card rounded-2xl border border-border shadow-xl p-4">
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          From → To
        </div>
        <div className="text-sm font-mono font-bold mb-3">
          {from} → {to}
        </div>
        <Field label="Setup Minutes">
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono"
          />
        </Field>
        <div className="mt-2">
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
            />
          </Field>
        </div>
        <div className="mt-2">
          <Field label="Data Source">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as DataSource)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="MEASURED">Measured</option>
              <option value="ESTIMATED">Estimated</option>
              <option value="DEFAULT">Default</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-2 mt-4">
          <PrimaryBtn
            onClick={() =>
              onSave({
                minutes,
                notes,
                source,
                updated_at: new Date().toISOString().slice(0, 10),
              })
            }
          >
            Update
          </PrimaryBtn>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 4. CSV IMPORT SCREEN
// ============================================================
type EntityType = "workcentres" | "shifts" | "grades" | "changeover" | "operators";
const ENTITIES: { id: EntityType; icon: string; label: string }[] = [
  { id: "workcentres", icon: "⬡", label: "Work Centres" },
  { id: "shifts", icon: "◈", label: "Shift Patterns" },
  { id: "grades", icon: "◉", label: "Material Grades" },
  { id: "changeover", icon: "◫", label: "Changeover" },
  { id: "operators", icon: "◎", label: "Operators" },
];

const ENTITY_HEADERS: Record<EntityType, string[]> = {
  workcentres: ["code", "name", "type", "rated_capacity_mt_per_shift", "efficiency_factor", "shifts_per_day", "status"],
  shifts: ["name", "shifts_per_day", "shift_a_start", "shift_a_end", "shift_b_start", "shift_b_end"],
  grades: ["code", "description", "family", "thickness_min_mm", "thickness_max_mm", "width_min_mm", "width_max_mm", "tensile_strength_max_mpa"],
  changeover: ["work_centre_id", "from_grade", "to_grade", "setup_minutes", "data_source", "notes"],
  operators: ["badge_id", "name", "status", "certified_lines", "grade_level"],
};

interface ParsedRow {
  values: Record<string, string>;
  errors: string[];
}

export function CsvImportScreen() {
  const [entity, setEntity] = useState<EntityType>("changeover");
  const [filename, setFilename] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [validated, setValidated] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [lastImport, setLastImport] = useState<{ entity: EntityType; rows: number; ts: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const expected = ENTITY_HEADERS[entity];

  const downloadTemplate = () => {
    const csv = expected.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return;
    const hdrs = lines[0].split(",").map((h) => h.trim());
    setHeaders(hdrs);
    const dataRows: ParsedRow[] = lines.slice(1).map((line) => {
      const cols = line.split(",");
      const values: Record<string, string> = {};
      hdrs.forEach((h, i) => (values[h] = (cols[i] ?? "").trim()));
      const errors: string[] = [];
      // Required field check on first column
      if (!values[hdrs[0]]) errors.push(`Missing ${hdrs[0]}`);
      return { values, errors };
    });
    setFilename(file.name);
    setRows(dataRows);
    setValidated(false);
    setImportDone(null);
  };

  const reset = () => {
    setFilename(null);
    setHeaders([]);
    setRows([]);
    setValidated(false);
    setImportDone(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleValidate = () => setValidated(true);

  const handleImport = async () => {
    setImporting(true);
    await new Promise((r) => setTimeout(r, 800));
    const ok = rows.filter((r) => r.errors.length === 0).length;
    const skipped = rows.length - ok;
    const created = Math.ceil(ok * 0.6);
    const updated = ok - created;
    setImportDone({ created, updated, skipped });
    setLastImport({
      entity,
      rows: ok,
      ts: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      ok: skipped === 0,
    });
    setImporting(false);
  };

  const validRows = rows.filter((r) => r.errors.length === 0).length;
  const errorRows = rows.length - validRows;

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            CSV Import · Data Ingestion Pipeline
          </div>
          <div className="text-sm font-semibold">Upsert master data from SAP / Excel exports</div>
        </div>
        {lastImport ? (
          <div className="flex items-center gap-2 text-xs">
            <Pill tone={lastImport.ok ? "success" : "warning"}>
              Last: {lastImport.entity}
            </Pill>
            <span className="font-mono text-muted-foreground">
              {lastImport.rows} rows · {lastImport.ts}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">No imports yet this session</span>
        )}
      </Card>

      {/* Step 1 — entity */}
      <Card className="p-4">
        <SectionHeader title="Step 1 · Select Entity" />
        <div className="flex flex-wrap gap-2">
          {ENTITIES.map((e) => {
            const sel = e.id === entity;
            return (
              <button
                key={e.id}
                onClick={() => {
                  setEntity(e.id);
                  reset();
                }}
                className={`w-24 h-20 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                  sel
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-2xl font-mono">{e.icon}</span>
                <span className="text-[10px] uppercase tracking-wider">{e.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <GhostBtn onClick={downloadTemplate}>↓ Download Template</GhostBtn>
        </div>
      </Card>

      {/* Step 2 — drop zone */}
      <Card className="p-4">
        <SectionHeader title="Step 2 · Upload File" />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) parseFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="min-h-[140px] rounded-lg border border-dashed border-border bg-secondary/40 hover:bg-accent/5 hover:border-accent/40 transition cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          {filename ? (
            <div className="flex items-center gap-3">
              <span className="text-success text-lg">✓</span>
              <span className="font-mono text-sm">{filename}</span>
              <span className="text-xs text-muted-foreground">{rows.length} rows</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="text-muted-foreground hover:text-destructive text-sm"
              >
                ✕ remove
              </button>
            </div>
          ) : (
            <>
              <span className="text-3xl text-muted-foreground">⬆</span>
              <div className="text-sm text-muted-foreground">
                Drop CSV file here or click to browse
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                Max 10MB · UTF-8 · Comma separated
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseFile(f);
            }}
          />
        </div>

        {rows.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Data Preview (first 5 rows)
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {headers.map((h) => {
                      const known = expected.includes(h);
                      return (
                        <th
                          key={h}
                          className={`text-left px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                            known ? "text-accent-foreground" : "text-destructive"
                          }`}
                        >
                          {h}
                          {!known && (
                            <span className="ml-1 text-[8px] text-destructive">unknown</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {headers.map((h) => (
                        <td key={h} className="px-2 py-1.5 font-mono text-muted-foreground">
                          {r.values[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Step 3 — validate */}
      {rows.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="Step 3 · Validate & Import" />
          {!validated ? (
            <PrimaryBtn onClick={handleValidate}>Validate</PrimaryBtn>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-success">
                    Ready
                  </div>
                  <div className="text-2xl font-bold text-success">{validRows}</div>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-warning">
                    Warnings
                  </div>
                  <div className="text-2xl font-bold text-warning">0</div>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-destructive">
                    Errors
                  </div>
                  <div className="text-2xl font-bold text-destructive">{errorRows}</div>
                </div>
              </div>
              {errorRows > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
                  <div className="font-semibold text-destructive mb-1">Error rows:</div>
                  <ul className="space-y-0.5 text-muted-foreground font-mono text-[11px]">
                    {rows
                      .map((r, i) => ({ r, i }))
                      .filter(({ r }) => r.errors.length > 0)
                      .slice(0, 5)
                      .map(({ r, i }) => (
                        <li key={i}>
                          Row {i + 2}: {r.errors.join(", ")}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {!importDone && (
                <div>
                  <PrimaryBtn onClick={handleImport} disabled={importing || validRows === 0}>
                    {importing ? "Importing…" : `Import ${validRows} Rows`}
                  </PrimaryBtn>
                </div>
              )}
              {importDone && (
                <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                  <div className="text-sm font-semibold text-success mb-1">
                    Import complete
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Created {importDone.created} · Updated {importDone.updated} · Skipped{" "}
                    {importDone.skipped}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
