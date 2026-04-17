import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { MentionInput } from "./MentionInput";
import { useCollab } from "@/contexts/CollabProvider";

interface Props {
  threadId: string;
  onSubmit: (body: string, mentions: string[]) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentComposer({ threadId, onSubmit, disabled, placeholder, autoFocus }: Props) {
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { typingByThreadId, emitTyping } = useCollab();
  const typingUsers = (typingByThreadId[threadId] ?? []).filter(Boolean);

  // Emit typing.start when text is non-empty; stop when empty / unmounted
  useEffect(() => {
    if (body.trim()) {
      emitTyping(threadId, true);
      const t = window.setTimeout(() => emitTyping(threadId, false), 4000);
      return () => window.clearTimeout(t);
    }
    emitTyping(threadId, false);
  }, [body, threadId, emitTyping]);

  useEffect(() => () => emitTyping(threadId, false), [threadId, emitTyping]);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed, mentions);
      setBody("");
      setMentions([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <MentionInput
        value={body}
        onChange={(v, m) => { setBody(v); setMentions(m); }}
        onSubmit={handleSubmit}
        disabled={disabled || submitting}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {typingUsers.length > 0 ? `${typingUsers.length} typing…` : <span className="opacity-60">⌘↵ to send</span>}
        </span>
        <Button size="sm" onClick={handleSubmit} disabled={disabled || submitting || !body.trim()}>
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          <span className="ml-1.5">Send</span>
        </Button>
      </div>
    </div>
  );
}
