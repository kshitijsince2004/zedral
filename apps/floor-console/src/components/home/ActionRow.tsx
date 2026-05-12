import { Pause, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { useFloorConsole } from "@/store/floorConsoleStore";
import { BigButton } from "@/components/shared/BigButton";

interface Props {
  onStoppage: () => void;
  onComplete: () => void;
  onReject: () => void;
  onResume: () => void;
}

export function ActionRow({ onStoppage, onComplete, onReject, onResume }: Props) {
  const lineStatus = useFloorConsole((s) => s.lineStatus);
  const stopped = lineStatus === "stopped";
  return (
    <div className="flex flex-col gap-3">
      {/* Top row: Stoppage/Resume + Raise Reject — compact side by side */}
      <div className="grid grid-cols-2 gap-3">
        {stopped ? (
          <BigButton
            variant="green"
            size="lg"
            icon={<Play className="fill-current" />}
            label="Resume"
            onClick={onResume}
          />
        ) : (
          <BigButton
            variant="amber"
            size="lg"
            icon={<Pause className="fill-current" />}
            label="Stoppage"
            onClick={onStoppage}
          />
        )}
        <BigButton
          variant="red"
          size="lg"
          icon={<AlertTriangle />}
          label="Raise Reject"
          onClick={onReject}
          disabled={lineStatus === "idle"}
        />
      </div>
      {/* Bottom row: Complete Job — full width, prominent */}
      <BigButton
        variant="green"
        size="xl"
        icon={<CheckCircle2 />}
        label="Complete Job"
        onClick={onComplete}
        disabled={lineStatus === "idle"}
      />
    </div>
  );
}
