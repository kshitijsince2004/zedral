import { useEffect, useState } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { Undo2 } from "lucide-react";

export function UndoStrip() {
  const undo = useFloorConsole((s) => s.undoAction);
  const setUndo = useFloorConsole((s) => s.setUndo);
  const undoLastAction = useFloorConsole((s) => s.undoLastAction);
  const [, force] = useState(0);

  useEffect(() => {
    if (!undo) return;
    const t = setInterval(() => force((n) => n + 1), 100);
    const remaining = undo.expires_at - Date.now();
    const timeout = setTimeout(() => setUndo(null), Math.max(0, remaining));
    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, [undo, setUndo]);

  if (!undo) return null;
  const remainingMs = Math.max(0, undo.expires_at - Date.now());
  const pct = (remainingMs / 3000) * 100;
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className="absolute inset-x-4 bottom-4 z-40 overflow-hidden rounded-2xl border border-border bg-primary text-primary-foreground shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <p className="text-sm font-semibold">{undo.label}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-primary-foreground/70">
            {seconds}s
          </span>
          <button
            onClick={undoLastAction}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wider text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Undo2 className="h-4 w-4" /> Undo
          </button>
        </div>
      </div>
      <div className="h-1 bg-primary-foreground/10">
        <div
          className="h-full bg-accent transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
