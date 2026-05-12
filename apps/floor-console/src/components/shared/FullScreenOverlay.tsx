import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  tone?: "default" | "danger" | "success";
}

export function FullScreenOverlay({
  title,
  subtitle,
  onClose,
  children,
  tone = "default",
}: Props) {
  const headerCls =
    tone === "danger"
      ? "bg-status-reject text-status-reject-foreground"
      : tone === "success"
        ? "bg-status-running text-status-running-foreground"
        : "bg-primary text-primary-foreground";
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute inset-0 z-50 flex flex-col bg-background"
    >
      <header className={`flex shrink-0 items-center gap-4 px-6 py-4 ${headerCls}`}>
        <button
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold uppercase tracking-wider">{title}</h2>
          {subtitle && <p className="truncate text-sm opacity-80">{subtitle}</p>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </motion.div>
  );
}
