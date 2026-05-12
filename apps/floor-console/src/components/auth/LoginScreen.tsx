import { useState } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { ScanLine } from "lucide-react";

export function LoginScreen() {
  const login = useFloorConsole((s) => s.login);
  const device = useFloorConsole((s) => s.device);
  const incomingPending = useFloorConsole((s) => s.incomingOperatorPending);
  const [value, setValue] = useState("");

  const submit = (operator_id: string, operator_name: string, shift: string) => {
    login({ operator_id, operator_name, shift });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    submit(value.trim().toLowerCase(), `Operator ${value.trim().toUpperCase()}`, "B");
    setValue("");
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
      <div className="w-full max-w-md px-8">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <span className="rounded-md bg-accent px-3 py-1 font-mono text-sm font-bold uppercase tracking-widest text-accent-foreground">
              Zedral
            </span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/60">
            {device.wc_id} · Andon Terminal
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">
            {incomingPending ? "Badge in to receive handover" : "Sign in to begin shift"}
          </h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-primary-foreground/70">
              Scan badge or enter operator ID
            </span>
            <div className="relative">
              <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="op_***"
                className="h-16 w-full rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/5 pl-12 pr-4 font-mono text-lg font-semibold text-primary-foreground outline-none placeholder:text-primary-foreground/30 focus:border-accent"
                autoFocus
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={!value.trim()}
            className="h-16 w-full rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/5 text-base font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-foreground/10 disabled:opacity-40"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() =>
              incomingPending
                ? submit("op_087", "Suresh Patel", "B")
                : submit("op_042", "Ramesh Kumar", "A")
            }
            className="h-20 w-full rounded-xl bg-accent text-base font-bold uppercase tracking-wider text-accent-foreground transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            ⚡ Quick Login
            <span className="mt-1 block text-xs font-medium normal-case opacity-80">
              {incomingPending
                ? "op_087 · Suresh Patel · Shift B"
                : "op_042 · Ramesh Kumar · Shift A"}
            </span>
          </button>
        </form>

        <p className="mt-12 text-center text-xs uppercase tracking-wider text-primary-foreground/40">
          {device.plant}
        </p>
      </div>
    </div>
  );
}
