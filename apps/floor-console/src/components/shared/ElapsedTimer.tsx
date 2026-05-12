import { useEffect, useState } from "react";

interface Props {
  start: string | Date;
  className?: string;
  prefix?: string;
}

function format(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function ElapsedTimer({ start, className, prefix }: Props) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Date.now() - new Date(start).getTime();
  return (
    <span className={className}>
      {prefix}
      {format(ms)}
    </span>
  );
}
