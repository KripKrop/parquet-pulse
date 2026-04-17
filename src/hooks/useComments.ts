import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentsApi, CommentObject, ListCommentsResponse } from "@/services/collabApi";
import { wsClient } from "@/services/wsClient";

const rowKey = (fileId: string, rowHash: string) => ["comments", "row", fileId, rowHash];
const repliesKey = (commentId: string) => ["comments", "replies", commentId];

export function useRowComments(fileId: string | null, rowHash: string | null) {
  const qc = useQueryClient();
  const enabled = !!fileId && !!rowHash;

  const query = useQuery({
    queryKey: enabled ? rowKey(fileId!, rowHash!) : ["comments", "noop"],
    queryFn: () => commentsApi.list(fileId!, rowHash!),
    enabled,
    staleTime: 15_000,
  });

  // Live updates
  useEffect(() => {
    if (!enabled) return;
    const offCreated = wsClient.on("comment.created", (p: any) => {
      const c: CommentObject = p?.comment ?? p;
      if (c.file_id !== fileId || c.row_hash !== rowHash) return;
      qc.setQueryData<ListCommentsResponse | undefined>(rowKey(fileId!, rowHash!), (prev) => {
        if (!prev) return prev;
        // Skip top-level reconcile if it's a reply
        if (c.parent_id) {
          // Replies are managed in repliesKey; bump reply_count optimistically
          return {
            ...prev,
            comments: prev.comments.map((root) =>
              root.id === c.parent_id ? { ...root, reply_count: (root.reply_count ?? 0) + 1 } : root
            ),
          };
        }
        // Reconcile by client_id (replace optimistic)
        const existsIdx = prev.comments.findIndex((x) => x.client_id && x.client_id === c.client_id);
        if (existsIdx >= 0) {
          const next = [...prev.comments];
          next[existsIdx] = c;
          return { ...prev, comments: next };
        }
        if (prev.comments.some((x) => x.id === c.id)) return prev;
        return { ...prev, comments: [...prev.comments, c], total: prev.total + 1 };
      });
      if (c.parent_id) {
        qc.setQueryData<ListCommentsResponse | undefined>(repliesKey(c.parent_id), (prev) => {
          if (!prev) return prev;
          if (prev.comments.some((x) => x.id === c.id)) return prev;
          return { ...prev, comments: [...prev.comments, c], total: prev.total + 1 };
        });
      }
    });

    const offUpdated = wsClient.on("comment.updated", (p: any) => {
      const c: CommentObject = p?.comment ?? p;
      const updateIn = (key: any[]) => qc.setQueryData<ListCommentsResponse | undefined>(key, (prev) => {
        if (!prev) return prev;
        return { ...prev, comments: prev.comments.map((x) => x.id === c.id ? c : x) };
      });
      updateIn(rowKey(c.file_id, c.row_hash));
      if (c.parent_id) updateIn(repliesKey(c.parent_id));
    });

    const offDeleted = wsClient.on("comment.deleted", (p: any) => {
      const id = p?.comment_id;
      const rh = p?.row_hash;
      if (rh && fileId) {
        qc.setQueryData<ListCommentsResponse | undefined>(rowKey(fileId, rh), (prev) => {
          if (!prev) return prev;
          return { ...prev, comments: prev.comments.map((c) => c.id === id ? { ...c, deleted: true, body: "" } : c) };
        });
      }
    });

    const offReactionAdded = wsClient.on("reaction.added", () => {
      qc.invalidateQueries({ queryKey: rowKey(fileId!, rowHash!) });
    });
    const offReactionRemoved = wsClient.on("reaction.removed", () => {
      qc.invalidateQueries({ queryKey: rowKey(fileId!, rowHash!) });
    });

    return () => { offCreated(); offUpdated(); offDeleted(); offReactionAdded(); offReactionRemoved(); };
  }, [enabled, fileId, rowHash, qc]);

  const create = useMutation({
    mutationFn: (vars: { body: string; mentions: string[]; parent_id?: string | null }) => {
      const client_id = crypto.randomUUID();
      // Optimistic
      qc.setQueryData<ListCommentsResponse | undefined>(rowKey(fileId!, rowHash!), (prev) => {
        if (!prev || vars.parent_id) return prev;
        const optimistic: CommentObject = {
          id: `temp-${client_id}`,
          client_id,
          file_id: fileId!,
          row_hash: rowHash!,
          parent_id: null,
          author: { user_id: "me", name: "You" },
          body: vars.body,
          mentions: [],
          reactions: [],
          reply_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          edited: false,
          deleted: false,
        };
        return { ...prev, comments: [...prev.comments, optimistic], total: prev.total + 1 };
      });
      return commentsApi.create({
        file_id: fileId!,
        row_hash: rowHash!,
        parent_id: vars.parent_id ?? null,
        body: vars.body,
        mentions: vars.mentions,
        client_id,
      });
    },
  });

  const edit = useMutation({
    mutationFn: (vars: { id: string; body: string; mentions: string[] }) =>
      commentsApi.edit(vars.id, { body: vars.body, mentions: vars.mentions }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => commentsApi.remove(id),
  });

  const toggleReaction = useMutation({
    mutationFn: (vars: { id: string; emoji: string }) => commentsApi.toggleReaction(vars.id, vars.emoji),
  });

  return { ...query, create, edit, remove, toggleReaction };
}

export function useReplies(commentId: string | null) {
  return useQuery({
    queryKey: commentId ? repliesKey(commentId) : ["comments", "replies", "noop"],
    queryFn: () => commentsApi.replies(commentId!),
    enabled: !!commentId,
    staleTime: 15_000,
  });
}
