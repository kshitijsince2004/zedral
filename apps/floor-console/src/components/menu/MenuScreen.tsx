import { useState } from "react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { AlertTriangle, FileText, Settings as SettingsIcon, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Sub = "main" | "issue" | "sop" | "settings";

export function MenuScreen() {
  const [sub, setSub] = useState<Sub>("main");
  const device = useFloorConsole((s) => s.device);
  const logout = useFloorConsole((s) => s.logout);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
        <p className="text-sm text-muted-foreground">
          {device.plant} · {device.wc_name}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
          <Tile icon={<AlertTriangle />} label="Raise Issue" onClick={() => setSub("issue")} tone="amber" />
          <Tile icon={<FileText />} label="SOP Viewer" onClick={() => setSub("sop")} tone="blue" />
          <Tile icon={<SettingsIcon />} label="Settings" onClick={() => setSub("settings")} tone="neutral" />
          <Tile
            icon={<X />}
            label="Sign Out"
            onClick={() => {
              logout();
              toast("Signed out");
            }}
            tone="red"
          />
        </div>
      </div>

      <AnimatePresence>
        {sub === "issue" && <RaiseIssue onClose={() => setSub("main")} />}
        {sub === "sop" && <SopViewer onClose={() => setSub("main")} />}
        {sub === "settings" && <Settings onClose={() => setSub("main")} />}
      </AnimatePresence>
    </div>
  );
}

function Tile({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: "amber" | "blue" | "neutral" | "red";
}) {
  const cls = {
    amber: "bg-status-stopped/10 text-status-stopped border-status-stopped/30",
    blue: "bg-status-setup/10 text-status-setup border-status-setup/30",
    neutral: "bg-card text-foreground border-border",
    red: "bg-status-reject/10 text-status-reject border-status-reject/30",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-3xl border-2 p-6 transition-all hover:scale-[1.02] active:scale-[0.98] ${cls}`}
    >
      <span className="[&>svg]:h-10 [&>svg]:w-10">{icon}</span>
      <span className="text-base font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-t-3xl bg-card p-6 sm:rounded-3xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function RaiseIssue({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("Equipment");
  const [text, setText] = useState("");
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between">
        <h3 className="text-2xl font-bold">Raise issue</h3>
        <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Non-production issue report</p>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Issue type
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {["Equipment", "Safety", "Material", "IT", "Other"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`h-12 rounded-full border-2 px-3 text-sm font-bold uppercase tracking-wider ${
                type === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Describe the issue..."
        className="mt-4 w-full resize-none rounded-xl border border-input bg-background p-3 text-base outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-3 flex gap-2">
        <button className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-secondary px-4 text-sm font-semibold">
          <Camera className="h-4 w-4" /> Attach photo
        </button>
      </div>

      <button
        disabled={!text.trim()}
        onClick={() => {
          toast.success("Issue logged · Ref #ISSUE-042");
          onClose();
        }}
        className="mt-5 h-[88px] w-full rounded-2xl bg-status-stopped text-base font-bold uppercase tracking-wider text-status-stopped-foreground disabled:opacity-40"
      >
        Submit issue
      </button>
    </Sheet>
  );
}

function SopViewer({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            SOP linked to active WO
          </p>
          <h3 className="mt-1 text-2xl font-bold">IS513-D Cold Rolling Procedure v2.3</h3>
        </div>
        <button onClick={onClose} className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-2xl font-bold">
          ✕
        </button>
      </div>
      <div className="mt-4 flex h-80 items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-center text-muted-foreground">
        <div>
          <FileText className="mx-auto h-12 w-12" />
          <p className="mt-3 text-sm">SOP PDF preview placeholder</p>
        </div>
      </div>
    </Sheet>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const device = useFloorConsole((s) => s.device);
  const [tone, setTone] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between">
        <h3 className="text-2xl font-bold">Settings</h3>
        <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Admin only · PIN gated</p>

      <div className="mt-5 space-y-3">
        <Row label="Line assignment" value={`${device.wc_id} · ${device.wc_name}`} />
        <Row label="Device ID" value={device.device_id} mono />
        <Row label="Plant" value={device.plant} />
      </div>

      <div className="mt-5 space-y-3">
        <Toggle label="Audio confirmation tone" value={tone} onChange={setTone} />
        <Toggle label="Large-font mode" value={largeFont} onChange={setLargeFont} />
      </div>
    </Sheet>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${value ? "bg-status-running" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}
