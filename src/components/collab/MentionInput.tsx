import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useTenantMembers } from "@/hooks/useTenantMembers";
import { TenantMember } from "@/services/collabApi";
import { AvatarChip } from "@/components/profile/AvatarChip";

interface Props {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Lightweight @mention textarea.
 * - Detects @ trigger and shows a dropdown
 * - Tracks mention user_ids separately from body text
 * - Submit on ⌘/Ctrl + Enter
 */
export function MentionInput({ value, onChange, onSubmit, placeholder, disabled, autoFocus }: Props) {
  const [query, setQuery] = useState<string | null>(null);
  const [mentions, setMentions] = useState<TenantMember[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { data: members = [] } = useTenantMembers(query ?? undefined);

  const filtered = useMemo(() => members.slice(0, 6), [members]);

  // Auto-grow
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const caret = e.target.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const m = before.match(/@(\w*)$/);
    setQuery(m ? m[1] : null);

    // Drop any mention whose name no longer appears verbatim in the body
    const stillReferenced = mentions.filter((u) => text.includes(`@${u.name}`));
    if (stillReferenced.length !== mentions.length) setMentions(stillReferenced);
    onChange(text, stillReferenced.map((u) => u.user_id));
  };

  const insertMention = (m: TenantMember) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@\w*$/, `@${m.name} `);
    const after = value.slice(caret);
    const next = before + after;
    const updatedMentions = mentions.some((x) => x.user_id === m.user_id) ? mentions : [...mentions, m];
    setMentions(updatedMentions);
    setQuery(null);
    onChange(next, updatedMentions.map((u) => u.user_id));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder ?? "Add a comment… (use @ to mention)"}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={1}
        className="min-h-[40px] resize-none"
      />
      {query !== null && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 left-0 right-0 max-h-56 overflow-auto rounded-md glass-float p-1">
          {filtered.map((m) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => insertMention(m)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left"
            >
              <AvatarChip name={m.name} email={m.email} avatarUrl={m.avatar_url} color={m.color} size="xs" ring={false} />
              <div className="min-w-0">
                <div className="text-sm truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
