// ─── LoadingSkeleton — shimmer grid placeholder ───────────────────────────────
interface LoadingSkeletonProps {
  rows?: number;
  cols?: number;
}

export function LoadingSkeleton({ rows = 4, cols = 3 }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-8 flex-1 rounded-md bg-muted"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
