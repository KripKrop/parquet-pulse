import { useState } from "react";
import { CommentObject } from "@/services/collabApi";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { CommentBody } from "./CommentBody";
import { ReactionBar } from "./ReactionBar";
import { CommentComposer } from "./CommentComposer";
import { Button } from "@/components/ui/button";
import { useReplies } from "@/hooks/useComments";
import { commentsApi } from "@/services/collabApi";
import { ChevronDown, ChevronRight, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  comment: CommentObject;
  onToggleReaction: (id: string, emoji: string) => void;
}

export function CommentThread({ comment, onToggleReaction }: Props) {
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const { data: replies, refetch } = useReplies(showReplies ? comment.id : null);

  const handleReply = async (body: string, mentions: string[]) => {
    await commentsApi.create({
      file_id: comment.file_id,
      row_hash: comment.row_hash,
      parent_id: comment.id,
      body,
      mentions,
      client_id: crypto.randomUUID(),
    });
    setReplying(false);
    setShowReplies(true);
    refetch();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <AvatarChip
          name={comment.author.name}
          email={comment.author.email}
          avatarUrl={comment.author.avatar_url}
          color={comment.author.color}
          size="sm"
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              {comment.edited && " · edited"}
            </span>
          </div>
          <CommentBody comment={comment} />
          <div className="flex items-center gap-3">
            <ReactionBar reactions={comment.reactions} onToggle={(e) => onToggleReaction(comment.id, e)} />
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setReplying((p) => !p)}>
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            {comment.reply_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowReplies((p) => !p)}
              >
                {showReplies ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {comment.reply_count} {comment.reply_count === 1 ? "reply" : "replies"}
              </Button>
            )}
          </div>

          {replying && (
            <div className="pt-2">
              <CommentComposer
                threadId={comment.id}
                onSubmit={handleReply}
                placeholder="Write a reply…"
                autoFocus
              />
            </div>
          )}

          {showReplies && replies && (
            <div className="pl-3 border-l border-border/50 space-y-3 mt-2">
              {replies.comments.map((r) => (
                <div key={r.id} className="flex gap-2">
                  <AvatarChip
                    name={r.author.name}
                    email={r.author.email}
                    avatarUrl={r.author.avatar_url}
                    color={r.author.color}
                    size="xs"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">{r.author.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <CommentBody comment={r} />
                    <ReactionBar reactions={r.reactions} onToggle={(e) => onToggleReaction(r.id, e)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
