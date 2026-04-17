import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRowComments } from "@/hooks/useComments";
import { CommentThread } from "./CommentThread";
import { CommentComposer } from "./CommentComposer";
import { Loader2, MessageSquare } from "lucide-react";
import { PinnedAIInsight } from "./PinnedAIInsight";
import { useAnnotationsForRow } from "@/hooks/useAnnotations";

interface Props {
  open: boolean;
  fileId: string | null;
  rowHash: string | null;
  rowPreview?: Record<string, any> | null;
  onOpenChange: (open: boolean) => void;
}

export function CommentDrawer({ open, fileId, rowHash, rowPreview, onOpenChange }: Props) {
  const { data, isLoading, create, toggleReaction } = useRowComments(fileId, rowHash);
  const { data: pinnedAnswers = [] } = useAnnotationsForRow(fileId, rowHash);

  const handleSend = async (body: string, mentions: string[]) => {
    await create.mutateAsync({ body, mentions, parent_id: null });
  };

  const handleToggleReaction = (id: string, emoji: string) => {
    toggleReaction.mutate({ id, emoji });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Row discussion
          </SheetTitle>
          {rowPreview && (
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1 max-h-20 overflow-hidden">
              {Object.entries(rowPreview)
                .filter(([k]) => k !== "_meta")
                .slice(0, 3)
                .map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="font-medium">{k}:</span> {String(v)}
                  </div>
                ))}
            </div>
          )}
        </SheetHeader>

        {pinnedAnswers.length > 0 && (
          <div className="p-3 border-b bg-muted/20 space-y-2">
            {pinnedAnswers.map((a) => (
              <PinnedAIInsight key={a.id} annotation={a} compact />
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading comments…
            </div>
          ) : (data?.comments?.length ?? 0) === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              No comments yet — be the first.
            </div>
          ) : (
            <div className="space-y-5">
              {data!.comments
                .filter((c) => !c.parent_id)
                .map((c) => (
                  <CommentThread key={c.id} comment={c} onToggleReaction={handleToggleReaction} />
                ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-3">
          <CommentComposer
            threadId={`root:${fileId}:${rowHash}`}
            onSubmit={handleSend}
            placeholder="Add a comment…"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
