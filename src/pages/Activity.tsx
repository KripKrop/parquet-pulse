import { motion } from "framer-motion";
import { useActivity } from "@/hooks/useActivity";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { Upload, Trash2, MessageSquare, Sparkles, Pin, Filter, Activity as ActivityIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  upload: Upload,
  delete: Trash2,
  comment: MessageSquare,
  ai_question: Sparkles,
  filter_shared: Filter,
  reaction: Pin,
};

export default function Activity() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useActivity();
  const events = data?.pages.flatMap((p) => p.events) ?? [];

  return (
    <motion.main
      className="container mx-auto max-w-3xl py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-6">
        <ActivityIcon className="h-5 w-5" />
        <h1 className="text-2xl font-semibold tracking-tight text-gradient-primary">Activity</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : events.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          No activity yet. Uploads, comments, and AI questions from your team will appear here.
        </div>
      ) : (
        <ol className="relative border-l border-border pl-6 space-y-4">
          {events.map((evt, i) => {
            const Icon = ICONS[evt.type] ?? ActivityIcon;
            return (
              <motion.li
                key={evt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="relative"
              >
                <span className="absolute -left-9 flex h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="glass-card rounded-lg p-3 flex items-start gap-3">
                  <AvatarChip
                    name={evt.actor.name}
                    avatarUrl={evt.actor.avatar_url}
                    color={evt.actor.color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{evt.actor.name}</span>{" "}
                      <span className="text-muted-foreground">{evt.type.replace(/_/g, " ")}</span>{" "}
                      <span className="font-medium">{evt.target.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </motion.main>
  );
}
