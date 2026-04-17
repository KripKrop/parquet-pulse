import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CommentReaction } from "@/services/collabApi";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "👀", "🚀", "✅"];

interface Props {
  reactions: CommentReaction[];
  onToggle: (emoji: string) => void;
}

export function ReactionBar({ reactions, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={cn(
            "inline-flex items-center gap-1 h-6 px-1.5 rounded-full text-xs border transition-all hover:scale-110 active:scale-95",
            r.reacted_by_me
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-muted/40 border-transparent hover:border-border",
          )}
        >
          <span>{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}
      <div className="relative group">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Plus className="h-3 w-3" />
        </Button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-0.5 p-1 rounded-md glass-float z-30">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => onToggle(e)}
              className="h-7 w-7 rounded hover:bg-accent flex items-center justify-center text-base"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
