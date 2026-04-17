import ReactMarkdown from "react-markdown";
import { CommentObject } from "@/services/collabApi";
import { Badge } from "@/components/ui/badge";

interface Props {
  comment: CommentObject;
}

export function CommentBody({ comment }: Props) {
  if (comment.deleted) {
    return <span className="text-xs italic text-muted-foreground">(comment deleted)</span>;
  }
  return (
    <div className="space-y-2">
      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
            p: ({ node, ...props }) => <p className="m-0" {...props} />,
          }}
        >
          {comment.body}
        </ReactMarkdown>
      </div>
      {comment.mentions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {comment.mentions.map((m) => (
            <Badge key={m.user_id} variant="secondary" className="text-[10px]">
              @{m.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
