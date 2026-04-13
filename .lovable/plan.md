

# Fix: Repeated "Unauthorized" Notifications on Page Load

## Root Cause

The `useDatasetVersion()` hook (called in `AppHeader`) fires `GET /columns` every 30 seconds **regardless of authentication state**. When the user is not logged in (or tokens are missing/expired), each request returns 401 and the `apiClient.ts` error handler shows an "Unauthorized" toast. Since `AppHeader` renders on every page including `/login`, this creates a flood of notifications.

Additionally, the `Index.tsx` page's `/columns` query also fires before the auth redirect completes.

## Fix

### 1. Guard `useDatasetVersion` hook with auth state

In `src/hooks/useDatasetVersionCheck.ts`, add an `enabled` parameter so consumers can disable it when not authenticated:

```typescript
export function useDatasetVersion(enabled: boolean = true) {
  return useQuery({
    queryKey: ["dataset-version"],
    queryFn: async () => { ... },
    enabled,              // <-- only fetch when true
    refetchInterval: enabled ? 30000 : false,
    staleTime: 20000,
  });
}
```

### 2. Pass `isAuthenticated` in `AppHeader.tsx`

```typescript
const { isAuthenticated, ... } = useAuth();
const { data: currentVersion } = useDatasetVersion(isAuthenticated);
```

### 3. Guard queries in `Index.tsx`

Add `useAuth()` and gate the `/columns` query:

```typescript
const { isAuthenticated } = useAuth();

const { data: colsData } = useQuery({
  queryKey: ["columns"],
  queryFn: ...,
  enabled: isAuthenticated,
});
```

### 4. Suppress duplicate 401 toasts in `apiClient.ts`

When there's no refresh token and the user isn't authenticated, avoid showing the toast (the auth redirect will handle it):

```typescript
if (res.status === 401) {
  const refresh = getRefreshToken();
  if (refresh && !isRefreshing) {
    // ... existing refresh logic ...
  }
  // Only toast if we actually had a token (i.e. session expired, not "never logged in")
  if (getAccessToken()) {
    toast({ title: "Unauthorized", ... });
  }
  // throw without toasting for unauthenticated requests
}
```

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useDatasetVersionCheck.ts` | Add `enabled` param |
| `src/components/layout/AppHeader.tsx` | Pass `isAuthenticated` to hook |
| `src/pages/Index.tsx` | Gate `/columns` query with auth |
| `src/services/apiClient.ts` | Suppress 401 toast when no token exists |

