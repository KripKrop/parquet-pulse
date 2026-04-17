import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function RowAnnotationBadge({ count, className, onClick }: Props) {
  if (count <= 0) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      className={cn(
        "inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-medium",
        "bg-accent text-accent-foreground hover:bg-accent/80 transition-colors",
        className,
      )}
      title={`${count} pinned AI insight${count === 1 ? "" : "s"}`}
    >
      <Pin className="h-2.5 w-2.5" />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
