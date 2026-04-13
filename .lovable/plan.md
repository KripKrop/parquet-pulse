

# Fix: Three Critical Issues

## Issues Identified

1. **`/ai` page shows "Not Found"**: The route `/ai` IS defined in `App.tsx` (line 46). However, the AI index badge in `AppHeader` uses `window.location.href = "/ai"` (lines 116, 134) which triggers a full page reload. Since tokens are stored in memory, this causes token loss, which triggers the auth guard redirect to `/login` before the AI page renders -- making it appear as "Not Found". The nav link at line 76-87 uses React Router's `NavLink` correctly, so clicking the "AI" nav item should work. The "Not Found" is likely caused by the auth redirect intercepting before the page renders.

2. **New tab requires re-login**: Tokens are stored purely in-memory variables (`let accessToken`, `let refreshToken` in `tokenManager.ts`). Opening a new tab creates a new JS context with null tokens.

3. **Browser back/forward or URL bar navigation requires re-login**: Same root cause -- `window.location.href` in the AI badge causes full page reload, wiping in-memory tokens.

## Root Cause

All three issues stem from **in-memory-only token storage**. The tokens must survive page reloads and new tabs.

## Fix Plan

### 1. Persist tokens in `sessionStorage` (same tab across reloads) + `localStorage` (cross-tab)

**File: `src/services/tokenManager.ts`**
- On `setTokens()`: write to both in-memory variables AND `localStorage`
- On `getAccessToken()` / `getRefreshToken()`: if in-memory is null, hydrate from `localStorage`
- On `clearTokens()`: clear both memory and `localStorage`
- Key names: `crunch_access_token`, `crunch_refresh_token`

### 2. Fix `window.location.href` in AppHeader to use React Router navigation

**File: `src/components/layout/AppHeader.tsx`**
- Replace `onClick={() => window.location.href = "/ai"}` with React Router's `useNavigate()` hook: `onClick={() => navigate("/ai")}`
- This avoids full page reloads entirely

### 3. Pass `isAuthenticated` to `useDatasetVersion` in AI sub-components

**Files: `src/components/ai/IndexManagement.tsx`, `src/components/ai/ConversationWorkspace.tsx`**
- Import `useAuth` and pass `isAuthenticated` to `useDatasetVersion(isAuthenticated)` to prevent unauthenticated API calls from these components too

### Files Modified

| File | Change |
|------|--------|
| `src/services/tokenManager.ts` | Persist/hydrate tokens from `localStorage` |
| `src/components/layout/AppHeader.tsx` | Use `navigate("/ai")` instead of `window.location.href` |
| `src/components/ai/IndexManagement.tsx` | Guard `useDatasetVersion` with auth |
| `src/components/ai/ConversationWorkspace.tsx` | Guard `useDatasetVersion` with auth |

