import { useState } from "react";
import { FullScreenOverlay } from "@/components/shared/FullScreenOverlay";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { Users, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

export function CrewConfirmOverlay({ onClose }: Props) {
  const device = useFloorConsole((s) => s.device);

  // Pre-populated from prior shift pattern (mock values)
  const [lineIncharge, setLineIncharge] = useState(device.operator_name);
  const [crewMembers, setCrewMembers] = useState<string[]>(["Suresh Yadav", "Mohan Singh"]);
  const [craneOperator, setCraneOperator] = useState("Ravi Kumar");
  const [shiftManager, setShiftManager] = useState("Ajay Sharma");
  const [newMember, setNewMember] = useState("");

  const addMember = () => {
    if (!newMember.trim()) return;
    setCrewMembers((prev) => [...prev, newMember.trim()]);
    setNewMember("");
  };

  const removeMember = (idx: number) => {
    setCrewMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const confirm = () => {
    if (!lineIncharge.trim()) return;
    toast.success("Crew confirmed", {
      description: `${device.wc_id} · Shift ${device.shift} · ${crewMembers.length + 1} crew`,
    });
    onClose();
  };

  return (
    <FullScreenOverlay
      title="Shift Start — Confirm Crew"
      subtitle={`${device.wc_id} · Shift ${device.shift}`}
      onClose={onClose}
    >
      <div className="mx-auto max-w-2xl space-y-5 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <Users className="h-6 w-6 shrink-0 text-accent" />
          <p className="text-sm font-semibold text-foreground">
            Confirm your crew for this shift. Pre-populated from the previous shift — edit if different.
          </p>
        </div>

        <Field label="Line Incharge">
          <input
            value={lineIncharge}
            onChange={(e) => setLineIncharge(e.target.value)}
            className="h-14 w-full rounded-2xl border border-input bg-background px-4 text-base font-semibold outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Crew Members">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            {crewMembers.map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                <span className="flex-1 text-sm font-semibold">{m}</span>
                <button
                  onClick={() => removeMember(i)}
                  className="text-muted-foreground hover:text-status-reject"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                placeholder="Add crew member name"
                className="h-12 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={addMember}
                className="inline-flex h-12 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-bold uppercase text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </Field>

        <Field label="Crane Operator (optional)">
          <input
            value={craneOperator}
            onChange={(e) => setCraneOperator(e.target.value)}
            className="h-14 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Shift Manager">
          <input
            value={shiftManager}
            onChange={(e) => setShiftManager(e.target.value)}
            className="h-14 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <button
          onClick={confirm}
          disabled={!lineIncharge.trim()}
          className="h-[88px] w-full rounded-2xl bg-status-running text-base font-bold uppercase tracking-wider text-status-running-foreground transition-all hover:bg-status-running/90 active:scale-[0.99] disabled:opacity-40"
        >
          ✓ Confirm Crew & Start Shift
        </button>
      </div>
    </FullScreenOverlay>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
