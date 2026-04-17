import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export function RowCommentBadge({ count, onClick, className }: Props) {
  const has = count > 0;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className={cn(
        "h-6 px-1.5 gap-1 text-xs",
        has ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100",
        className,
      )}
      aria-label={has ? `${count} comment${count === 1 ? "" : "s"}` : "Add comment"}
    >
      <MessageSquare className="h-3 w-3" />
      {has && <span className="tabular-nums">{count}</span>}
    </Button>
  );
}
