import { Pin, Sparkles } from "lucide-react";
import { AnnotationObject } from "@/services/annotationsApi";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  annotation: AnnotationObject;
  compact?: boolean;
}

export function PinnedAIInsight({ annotation, compact }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2",
        compact && "p-2"
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        <Pin className="h-3 w-3 text-primary" />
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="font-medium text-primary">Pinned AI insight</span>
        <span className="text-muted-foreground">·</span>
        <AvatarChip
          name={annotation.author.name}
          avatarUrl={annotation.author.avatar_url}
          color={annotation.author.color}
          size="xs"
          ring={false}
        />
        <span className="text-muted-foreground truncate">
          {annotation.author.name} · {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
        </span>
      </div>
      <p className={cn("text-sm whitespace-pre-wrap", compact && "text-xs")}>{annotation.preview}</p>
    </div>
  );
}
