// ─── Footer — module status bar ──────────────────────────────────────────────
interface Props {
  moduleCode: string;
}

export function Footer({ moduleCode }: Props) {
  return (
    <footer className="mt-auto pt-6 pb-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground/40">
      Zedral MES · {moduleCode} · Hero Steel Plant 1100
    </footer>
  );
}
