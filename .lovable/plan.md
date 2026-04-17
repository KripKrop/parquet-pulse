

# Frontend Plan: Real-Time Collaborative Workspaces

Implementing the collaboration layer against the new backend contract in `app/collaboration.py`. Built incrementally so each phase is verifiable on its own.

---

## Phase 1 — Identity Foundation

Extend the user model so every avatar/name surface uses server-owned identity.

**Modify**
- `src/types/auth.ts` — add `name`, `avatar_url: string | null`, `color: string`, `has_taken_tour` to `User`. Drop client-derived color logic.
- `src/services/tokenManager.ts` — `getUserFromToken()` reads `name`, `avatar_url`, `color` from JWT if present; otherwise leaves them undefined and lets `/me` hydrate.
- `src/contexts/AuthContext.tsx` — after `login`/`register`, seed full identity from response. Add `refreshProfile()` and `updateProfile(payload)` methods. On `tour_completed` → `has_taken_tour` rename, keep tour wiring working.
- `src/services/userApi.ts` — add `getMe()` and `updateProfile({ name, avatar_url })` → `PATCH /me/profile`.

**Create**
- `src/components/profile/AvatarChip.tsx` — reusable: prefers `avatar_url`, falls back to initials from `name`, ring/accent uses `color`. Sizes sm/md/lg. Optional online dot.
- `src/components/profile/ProfileCompletionModal.tsx` — first-run modal "How teammates will see you" shown when `avatar_url == null` or name looks auto-generated. Name input + image URL field (no binary upload — we accept a public URL; storage upload deferred unless user opts in to Lovable Cloud).
- `src/pages/Profile.tsx` (or extend `Settings.tsx`) — editable name, avatar preview, replace/remove actions.

---

## Phase 2 — Collaboration Client & Provider

One client owns the live socket, fallbacks, heartbeat, and tenant-wide state.

**Create**
- `src/services/wsClient.ts` — connects to `wss://demoapi.crunchy.sigmoidsolutions.io/ws/workspace` with `Sec-WebSocket-Protocol: bearer.<token>` first, `?token=` fallback. Replies `pong` to `ping`. Exponential backoff (1s → 30s). Replaces local state from each `snapshot`. On close `4003` → token refresh + reconnect. Typed event emitter.
- `src/services/sseClient.ts` — `EventSource` to `GET /events/stream?token=...`. Same event shapes. Activates only after WS gives up.
- `src/services/collabApi.ts` — REST wrappers: comments CRUD + replies + reactions, notifications, activity, tenant members, annotations, presence heartbeat, cursor REST fallback. Separate error parser for `{ error: { code, message } }`.
- `src/contexts/CollabProvider.tsx` — single provider near app root. Owns:
  - `onlineUsers` (snapshot.users + incremental `presence.*`)
  - `cursorsByUserId`
  - `unreadNotifications`
  - `typingByThreadId`
  - WS/SSE/REST polling fallback chain
  - Exposes `broadcastViewState(viewState)`, `broadcastCursor({x,y,target})`, `broadcastCursorLeave()`
- `src/hooks/useViewStateBroadcast.ts` — debounced 500ms; called from pages whenever route, dataset, filters, or page context changes. Normalizes `view_state` so workspace matching is stable.
- `src/hooks/useCursorBroadcast.ts` — attaches to a container ref; throttles `mousemove` to 30fps; sends `cursor.leave` on `mouseleave`/`blur`/route change.

**Modify**
- `src/App.tsx` — wrap routes in `<CollabProvider>` (inside `AuthProvider`).

---

## Phase 3 — Row Meta & Table Affordances

**Modify**
- `src/types/api.ts` — add `RowMeta { row_hash: string; file_id: string; comment_count: number; annotation_count: number }`. Row type gains optional `_meta: RowMeta`. Note in type: `row_hash` is always string.
- `src/services/filesApi.ts` & `src/services/ragApi.ts` — accept and forward `include_row_meta: true` on `/query`, `/files/:file_id/query`, `/ask`. `/ask` response now carries `answer_id`.
- `src/components/table/DataTable.tsx`:
  - Render `<RowCommentBadge>` (count from `_meta.comment_count`) + `<RowAnnotationBadge>` (from `_meta.annotation_count`) per row.
  - Click row badge → opens `<CommentDrawer>` keyed on `file_id + row_hash`.
  - Hover row → "💬 Comment" quick action.
  - Mount `<GhostCursors>` overlay; attach `useCursorBroadcast` to table container.

**Create**
- `src/components/collab/RowCommentBadge.tsx`
- `src/components/collab/RowAnnotationBadge.tsx`
- `src/components/collab/GhostCursors.tsx` — absolute overlay; one `motion.div` per remote cursor; spring lerp; name pill in user color; fades after 3s idle. Respects `prefers-reduced-motion`.

---

## Phase 4 — Comments & Threads

Two-level threading only (root + direct replies).

**Create**
- `src/hooks/useComments.ts` — `useRowComments(fileId, rowHash)` → `GET /comments?file_id=...&row_hash=...`; `useReplies(commentId)` → `GET /comments/:id/replies`. Mutations: `create`, `edit`, `delete`, `toggleReaction`. Optimistic updates with `client_id` reconciliation when WS echoes back.
- `src/hooks/useTenantMembers.ts` — `GET /tenant/members?q=...`, 60s cache, used for @mentions and name resolution.
- `src/components/collab/CommentDrawer.tsx` — right-side `Sheet` with sticky row preview at top + thread below.
- `src/components/collab/CommentThread.tsx` — root comment + `CommentReplyList`. No deeper nesting UI.
- `src/components/collab/CommentComposer.tsx` — auto-grow textarea, markdown body, emoji picker, ⌘↵ submit, "X is typing" indicator (consumes `typing.byThreadId`, emits `typing.start/stop` via WS).
- `src/components/collab/MentionInput.tsx` — `@`-trigger dropdown over textarea using `useTenantMembers`. Submits comment with `mentions: ["user_id", ...]` array separate from body text.
- `src/components/collab/ReactionBar.tsx` — emoji chips with counts; primary tint when `reacted_by_me`; quick-add `+` opens picker.
- `src/components/collab/CommentBody.tsx` — renders markdown + highlights mention chips from resolved `mentions` metadata (not by parsing body).

---

## Phase 5 — Notifications

**Create**
- `src/hooks/useNotifications.ts` — `GET /notifications`, paginated; `markRead(id)`, `markAllRead()`. Live unread count from `CollabProvider` (seeded by snapshot, incremented on `notification.created`).
- `src/components/collab/NotificationBell.tsx` — header bell with unread badge, pulse on new arrival, popover lists recent items with actor avatar + action + relative time. Click → `router.push(deep_link)`.

**Modify**
- `src/components/layout/AppHeader.tsx` — mount `<PresenceAvatars />` (left of user menu) + `<NotificationBell />` + "Activity" nav link.

---

## Phase 6 — Presence Avatars in Header

**Create**
- `src/components/collab/PresenceAvatars.tsx` — stacked avatars (max 4 + "+N"), `-ml-2` overlap, 2px ring in user color, online dot. Hover popover: name, email, derived view_state summary ("Filtering sales.csv by region=EU"). Summary derived client-side from `view_state` (no server call).
- `src/lib/viewStateSummary.ts` — pure function: `(viewState) => string` for hovercards.

---

## Phase 7 — Activity Feed

**Create**
- `src/hooks/useActivity.ts` — infinite query against `GET /activity?types=...&user_id=...`. Live prepend on `activity.created` (no refetch).
- `src/pages/Activity.tsx` — full-page chronological feed. Filter chips for type + user. Vertical timeline with colored icon circle per event type. Glass-card style. Infinite scroll using existing prefetch pattern.

**Modify**
- `src/App.tsx` — add `/activity` route.

---

## Phase 8 — AI Answer Pinning (Annotations)

**Modify**
- `src/services/ragApi.ts` — surface `answer_id` from `/ask` response.
- `src/components/ai/ConversationWorkspace.tsx` — "Pin to row" and "Pin to view" buttons on AI responses.
  - Row pin → `POST /annotations { answer_id, anchor: { kind: "row", file_id, row_hash } }`
  - View pin → `POST /annotations { answer_id, anchor: { kind: "view", route, view_state } }`

**Create**
- `src/services/annotationsApi.ts` — `createAnnotation`, `resolveForRow(fileId, rowHash)`, `resolveForView(route, viewState)` (passes view_state as JSON string).
- `src/hooks/useAnnotations.ts` — keyed caches `byRowKey` and `byViewKey`.
- `src/components/collab/PinnedAIInsight.tsx` — card shown when annotations exist for current row/view. Inline above table for view-pins; inside `CommentDrawer` for row-pins.

**Modify**
- `src/pages/Index.tsx` — query view-scoped annotations whenever `view_state` changes, render `<PinnedAIInsight>` bar above the table.

---

## Phase 9 — Resilience & Polish

- `wsClient` retries 3× → switches to SSE → if SSE fails, REST polling every 15s (presence + notifications only; cursors disabled). Banner: "Live collaboration unavailable — refresh to retry."
- Token refresh on close `4003` reuses existing `tokenManager`.
- Optimistic comments: send `client_id` in POST; reconcile when WS echoes `comment.created`.
- Rate-limit awareness: respect `429` `Retry-After` header in `collabApi`.
- Reduced motion: disable cursor lerp + bell pulse, fade only.
- Tour update: extend onboarding tour with one step pointing at `<NotificationBell>` and one at row comment badge (deferred; mention only).

---

## State Model Summary

```
auth.user: { user_id, email, name, avatar_url, color, has_taken_tour }
collab.onlineUsers
collab.cursorsByUserId
collab.unreadNotifications
collab.typingByThreadId
comments.byRowKey["fileId:rowHash"]
annotations.byRowKey, annotations.byViewKey
activity.feed
```

## Files Summary

| File | Action |
|------|--------|
| `src/types/auth.ts`, `src/types/api.ts` | Modify |
| `src/services/tokenManager.ts`, `userApi.ts`, `filesApi.ts`, `ragApi.ts` | Modify |
| `src/services/wsClient.ts`, `sseClient.ts`, `collabApi.ts`, `annotationsApi.ts` | Create |
| `src/contexts/AuthContext.tsx` | Modify |
| `src/contexts/CollabProvider.tsx` | Create |
| `src/hooks/useViewStateBroadcast.ts`, `useCursorBroadcast.ts`, `useComments.ts`, `useTenantMembers.ts`, `useNotifications.ts`, `useActivity.ts`, `useAnnotations.ts` | Create |
| `src/components/profile/AvatarChip.tsx`, `ProfileCompletionModal.tsx` | Create |
| `src/components/collab/*` (PresenceAvatars, GhostCursors, NotificationBell, CommentDrawer, CommentThread, CommentComposer, MentionInput, ReactionBar, CommentBody, RowCommentBadge, RowAnnotationBadge, PinnedAIInsight) | Create |
| `src/lib/viewStateSummary.ts` | Create |
| `src/pages/Activity.tsx` | Create |
| `src/pages/Profile.tsx` or `Settings.tsx` | Modify/Create |
| `src/components/table/DataTable.tsx`, `layout/AppHeader.tsx`, `pages/Index.tsx`, `components/ai/ConversationWorkspace.tsx`, `App.tsx` | Modify |

No new dependencies. Uses existing `framer-motion`, `Sheet`, `Popover`, glass-card tokens, `react-query`.

