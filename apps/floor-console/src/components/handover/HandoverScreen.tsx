import { useState, useRef } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { Plus, X, PenLine, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function HandoverScreen() {
  const dispatch = useFloorConsole((s) => s.dispatch);
  const device = useFloorConsole((s) => s.device);
  const events = useFloorConsole((s) => s.events);
  const submitHandover = useFloorConsole((s) => s.submitHandover);
  const handoverStatus = useFloorConsole((s) => s.handoverStatus);
  const handover = useFloorConsole((s) => s.handover);
  const incomingPending = useFloorConsole((s) => s.incomingOperatorPending);
  const setIncomingPending = useFloorConsole((s) => s.setIncomingPending);
  const acknowledgeHandover = useFloorConsole((s) => s.acknowledgeHandover);

  const [machineState, setMachineState] = useState("");
  const [safety, setSafety] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [pendingDraft, setPendingDraft] = useState("");
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const r = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const r = canvasRef.current!.getBoundingClientRect();
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    setSigned(true);
  };

  const endDraw = () => { drawing.current = false; };

  const clearSig = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSigned(false);
  };
  const [incomingComment, setIncomingComment] = useState("");
  const [incomingSigned, setIncomingSigned] = useState(false);
  const incomingCanvasRef = useRef<HTMLCanvasElement>(null);
  const incomingDrawing = useRef(false);

  const startIncomingDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    incomingDrawing.current = true;
    const ctx = incomingCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const r = incomingCanvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  };

  const drawIncoming = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!incomingDrawing.current) return;
    const ctx = incomingCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const r = incomingCanvasRef.current!.getBoundingClientRect();
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    setIncomingSigned(true);
  };

  const endIncomingDraw = () => { incomingDrawing.current = false; };

  const clearIncomingSig = () => {
    const ctx = incomingCanvasRef.current?.getContext("2d");
    if (!ctx || !incomingCanvasRef.current) return;
    ctx.clearRect(0, 0, incomingCanvasRef.current.width, incomingCanvasRef.current.height);
    setIncomingSigned(false);
  };

  const completed = dispatch.filter((i) => i.actual_status === "complete");
  const inProgress = dispatch.filter(
    (i) => i.actual_status === "production_in_progress" || i.actual_status === "setup_in_progress",
  );
  const stoppages = events.filter((e) => e.type === "stoppage_started").length;
  const stoppageMins = events
    .filter((e) => e.type === "stoppage_ended")
    .reduce((sum, e) => sum + (e.duration_min ?? 0), 0);

  // Incoming view
  if (incomingPending && handover && handoverStatus === "submitted") {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-card px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Incoming handover
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            From: {handover.outgoing_operator} · Shift {handover.shift_from}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Completed" value={`${completed.length}`} />
              <Stat label="In Progress" value={`${inProgress.length}`} />
              <Stat label="Stoppages" value={`${stoppages} (${stoppageMins}m)`} />
            </div>
            <Block label="Machine state" body={handover.machine_state || "—"} />
            <Block label="Safety notes" body={handover.safety_notes || "—"} />
            <Block
              label="Pending items"
              body={
                handover.pending_items.length
                  ? handover.pending_items.map((p) => `• ${p}`).join("\n")
                  : "—"
              }
            />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Add comment (optional)
              </span>
              <textarea
                value={incomingComment}
                onChange={(e) => setIncomingComment(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Incoming operator signature
              </p>
              <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30">
                <canvas
                  ref={incomingCanvasRef}
                  width={600}
                  height={140}
                  className="w-full touch-none cursor-crosshair"
                  onPointerDown={startIncomingDraw}
                  onPointerMove={drawIncoming}
                  onPointerUp={endIncomingDraw}
                  onPointerLeave={endIncomingDraw}
                />
                {!incomingSigned && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <PenLine className="h-4 w-4" />
                    Sign to accept
                  </div>
                )}
                {incomingSigned && (
                  <button
                    onClick={clearIncomingSig}
                    className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-background/80 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              {incomingSigned && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-status-running">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Signed
                </p>
              )}
            </div>

            <button
              onClick={() => {
                acknowledgeHandover(incomingComment || undefined);
                toast.success("Handover accepted");
              }}
              disabled={!incomingSigned}
              className="h-[88px] w-full rounded-2xl bg-status-running text-base font-bold uppercase tracking-wider text-status-running-foreground hover:bg-status-running/90 disabled:opacity-40"
            >
              ✓ Accept handover
            </button>
            <button
              onClick={() => setIncomingPending(false)}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (handoverStatus === "submitted" && !incomingPending) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl">✓</div>
        <h2 className="mt-4 text-2xl font-bold">Handover submitted</h2>
        <p className="mt-2 text-muted-foreground">
          Waiting for incoming operator to acknowledge.
        </p>
      </div>
    );
  }

  const submit = () => {
    submitHandover({
      machine_state: machineState,
      safety_notes: safety,
      pending_items: pending,
    });
    toast.success("Handover submitted to incoming shift");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Shift handover
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Shift {device.shift} → Shift {device.shift === "A" ? "B" : "A"} · {device.wc_id}
        </h2>
        <p className="text-sm text-muted-foreground">Outgoing: {device.operator_name}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Jobs this shift (auto-filled)
            </p>
            <div className="space-y-1.5 rounded-2xl border border-border bg-card p-4">
              {completed.map((i) => (
                <p key={i.item_id} className="text-sm">
                  ✓ <span className="font-mono">{i.wo_id}</span> · {i.grade} ·{" "}
                  {i.qty_actual_mt?.toFixed(2)} MT · Complete
                </p>
              ))}
              {inProgress.map((i) => (
                <p key={i.item_id} className="text-sm">
                  ▶ <span className="font-mono">{i.wo_id}</span> · {i.grade} · In progress
                  <span className="block pl-5 text-xs italic text-muted-foreground">
                    (job will carry over to next shift)
                  </span>
                </p>
              ))}
            </div>
          </section>

          <Textarea
            label="Machine state notes"
            placeholder="Any issues with the machine?"
            value={machineState}
            onChange={setMachineState}
          />
          <Textarea
            label="Safety notes"
            placeholder="Any safety concerns to flag?"
            value={safety}
            onChange={setSafety}
          />

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pending items
            </p>
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              {pending.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                  <span className="flex-1 text-sm">{p}</span>
                  <button
                    onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-status-reject"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={pendingDraft}
                  onChange={(e) => setPendingDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pendingDraft.trim()) {
                      setPending((prev) => [...prev, pendingDraft.trim()]);
                      setPendingDraft("");
                    }
                  }}
                  placeholder="Add pending item (e.g. coil stuck, call pending)"
                  className="h-12 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => {
                    if (!pendingDraft.trim()) return;
                    setPending((prev) => [...prev, pendingDraft.trim()]);
                    setPendingDraft("");
                  }}
                  className="inline-flex h-12 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-bold uppercase text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outgoing operator signature
            </p>
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30">
              <canvas
                ref={canvasRef}
                width={600}
                height={140}
                className="w-full touch-none cursor-crosshair"
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
              {!signed && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <PenLine className="h-4 w-4" />
                  Sign here
                </div>
              )}
              {signed && (
                <button
                  onClick={clearSig}
                  className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-background/80 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            {signed && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-status-running">
                <CheckCircle2 className="h-3.5 w-3.5" /> Signed — {device.operator_name}
              </p>
            )}
          </section>

          <button
            onClick={submit}
            disabled={!signed}
            className="h-[88px] w-full rounded-2xl bg-accent text-base font-bold uppercase tracking-wider text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
          >
            Submit handover
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-line text-base text-foreground">{body}</p>
    </div>
  );
}

function Textarea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-base outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
