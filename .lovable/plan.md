

## Plan: Tenant Member Management in Settings

Add a "Team Members" section to Settings allowing owners to view, add, modify, and remove tenant members using the new `/tenant-members` endpoints.

---

### 1. API layer

**Modify `src/services/collabApi.ts`** — extend `membersApi` with new methods (keep existing `list(q)` for @mentions which uses `/tenant/members`):

```ts
tenantMembersApi = {
  list: () => GET /tenant-members
  add: ({ email, password?, name?, role }) => POST /tenant-members
  updateRole: (userId, role) => PATCH /tenant-members/:userId/role
  remove: (userId) => DELETE /tenant-members/:userId
}
```

Backend accepts two POST shapes (with or without `password`+`name`); the API wrapper passes through whatever fields are provided.

---

### 2. Hooks

**Create `src/hooks/useTenantMembersAdmin.ts`** — react-query wrappers:
- `useTenantMembersList()` — query, key `["tenant-members-admin"]`
- `useAddTenantMember()` — mutation, invalidates list
- `useUpdateMemberRole()` — mutation, invalidates list
- `useRemoveMember()` — mutation, invalidates list

Errors surface via `toast` (handles 403, 409 email-exists, 400 weak password).

---

### 3. UI: Team Members card in Settings

**Create `src/components/settings/TenantMembersCard.tsx`** — owner-only glass card with:

- **Header:** "Team Members" + "Invite member" button (opens dialog)
- **Member list:** rows showing `<AvatarChip>` + name + email + role badge + actions menu
  - Actions per row (hidden for self and for owners if current user isn't owner): "Change role" (toggle member ⇄ owner), "Remove from tenant" (confirm dialog)
- **Empty/loading/error states** consistent with existing glass-card patterns
- Uses `framer-motion` stagger for row entry

**Create `src/components/settings/AddMemberDialog.tsx`** — Dialog with two tabs:
- **Tab 1: "New user"** — fields: email, name, password (with strength hint), role select. Calls `add({ email, password, name, role })`.
- **Tab 2: "Existing user"** — fields: email, role select. Calls `add({ email, role })` (no password).
- Zod validation: email format, password ≥ 8 chars w/ complexity, name ≤ 100 chars
- On success: toast + close + invalidate list. On 409 conflict in Tab 1, suggests switching to Tab 2.

**Create `src/components/settings/RemoveMemberDialog.tsx`** — `AlertDialog` confirmation with member name, requires explicit confirm.

**Modify `src/pages/Settings.tsx`** — mount `<TenantMembersCard />` between Account Information and Danger Zone, gated to `role === 'owner' || 'platform_admin' || 'superadmin'`. Non-privileged users see a small "Members are managed by your tenant owner" note.

---

### 4. Cross-cutting

- Reuse existing `AvatarChip` for avatars, `Badge` for roles, `Dialog`/`AlertDialog`/`Tabs`/`Select` from shadcn.
- No backend changes required; uses bearer token already in `apiClient`.
- After mutations, also invalidate `["tenant-members"]` (the @mentions cache) so new members appear in mention autocomplete immediately.
- Security: client-side zod validation + server validates; no role escalation possible because backend enforces `owner`-only writes.

---

### Files Summary

| File | Action |
|------|--------|
| `src/services/collabApi.ts` | Modify — add `tenantMembersApi` |
| `src/hooks/useTenantMembersAdmin.ts` | Create |
| `src/components/settings/TenantMembersCard.tsx` | Create |
| `src/components/settings/AddMemberDialog.tsx` | Create |
| `src/components/settings/RemoveMemberDialog.tsx` | Create |
| `src/pages/Settings.tsx` | Modify — mount card |

No new dependencies.

