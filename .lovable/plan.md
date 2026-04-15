

# Implementation Plan: File Sorting, Search, Multi-Select, and Comparison

## Overview

Four features for the Files page (`src/pages/Files.tsx`) -- all client-side, operating on the existing `filesData.files` array from `GET /files`. No backend changes, no theme changes.

## Architecture

```text
Files.tsx (state owner)
 ├── FileToolbar (search input + bulk action buttons + compare button)
 ├── Sortable TableHead columns (click to sort)
 ├── Checkbox column for multi-select
 ├── FileComparisonDialog (side-by-side schema diff)
 └── existing: FileDetailsDrawer, DeleteFileDialog
```

All filtering, sorting, and selection state lives in `Files.tsx`. A new `FileComparisonDialog` component handles the comparison view.

---

## Feature 1: File Sorting

**How it works**: Each sortable column header (`File`, `Uploaded`, `Size`, `Rows`) gets a click handler that toggles sort direction. An arrow icon indicates current sort column and direction.

**State**:
```ts
const [sortKey, setSortKey] = useState<"filename" | "uploaded_at" | "size_bytes" | "current_row_count">("uploaded_at");
const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
```

**Implementation**: A `sortedFiles` computed variable applies `Array.sort()` on the `files` array using `sortKey` and `sortDir`. The `TableHead` cells become clickable with `ArrowUp`/`ArrowDown` icons from lucide. Clicking the same column toggles direction; clicking a new column defaults to descending.

**File modified**: `src/pages/Files.tsx` only.

---

## Feature 2: File Search/Filter Bar

**How it works**: A text input above the table filters the file list by filename (case-insensitive substring match). Uses `useDebounce` (already exists at `src/hooks/useDebounce.ts`) for 200ms debounce.

**State**:
```ts
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearch = useDebounce(searchQuery, 200);
```

**Implementation**: An `Input` with a `Search` icon placed in a toolbar row between the stats cards and the table. `filteredFiles` filters `sortedFiles` by `file.filename.toLowerCase().includes(debouncedSearch.toLowerCase())`. The results count is shown as a subtle badge.

**File modified**: `src/pages/Files.tsx` only.

---

## Feature 3: Multi-Select with Bulk Actions

**How it works**: A checkbox column is added to the table. A header checkbox toggles select-all (for visible/filtered files). When files are selected, a toolbar appears with bulk actions.

**State**:
```ts
const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
```

**Bulk actions available**:
1. **Bulk Delete**: Opens the existing `DeleteFileDialog` iteratively, or a new confirmation dialog that loops through selected files calling the existing `deleteFileDryRun` + `deleteFileConfirm` APIs sequentially. Since the backend already has per-file delete, we process them one at a time with a progress indicator.
2. **Bulk Filter**: Navigates to `/?files=id1,id2,...` to filter the dataset by all selected files.
3. **Export Metadata CSV**: Client-side generates a CSV of the selected files' metadata (filename, file_id, uploaded_at, size_bytes, current_row_count, columns list) and triggers a download using `Blob` + `URL.createObjectURL`.

**Selection behavior**:
- Clicking a row checkbox toggles that file
- Header checkbox: if all visible files are selected, deselects all; otherwise selects all visible
- Selection clears when search query changes
- Selected count shown in toolbar

**Files modified**: `src/pages/Files.tsx` (checkbox column, toolbar, actions).

---

## Feature 4: File Comparison View

**How it works**: When exactly 2 files are selected, a "Compare" button appears. Clicking it opens a dialog showing side-by-side schema comparison.

**New component**: `src/components/files/FileComparisonDialog.tsx`

**Comparison data** (derived from `files` array which includes `columns_map`):
- **Header**: File A name vs File B name
- **Stats row**: Row count, size, upload date for each
- **Schema diff table**: Union of all column names from both files' `columns_map`. Each row shows:
  - Column name
  - Present in File A (checkmark or dash)
  - Present in File B (checkmark or dash)
  - Columns unique to one file highlighted in a subtle color (green for added, red for missing)

**Props**:
```ts
interface FileComparisonDialogProps {
  fileA: FilesListResponse["files"][0];
  fileB: FilesListResponse["files"][0];
  open: boolean;
  onClose: () => void;
}
```

**Files created**: `src/components/files/FileComparisonDialog.tsx`
**Files modified**: `src/pages/Files.tsx`

---

## Implementation Order

1. Add sort state and sortable column headers to `Files.tsx`
2. Add search input with debounce to `Files.tsx`
3. Add checkbox column and multi-select state to `Files.tsx`
4. Add bulk action toolbar (delete, filter, export CSV)
5. Create `FileComparisonDialog.tsx`
6. Wire compare button to dialog when 2 files selected

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/pages/Files.tsx` | Modify | Sort state, search bar, checkbox column, bulk toolbar, compare button |
| `src/components/files/FileComparisonDialog.tsx` | Create | Side-by-side schema comparison dialog |

No new dependencies required. Uses existing `useDebounce` hook, `Checkbox` component, `Dialog` component, and `Input` component.

