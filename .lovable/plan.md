

# Implementation Plan: Column Controls, Row Detail Modal, and Keyboard Shortcuts

## Overview

Five features for the DataTable on the Index page -- all purely client-side, no backend changes, no theme changes.

## Architecture

A new `ColumnSettings` component will manage visibility, order, and pinning state. State will be lifted to `Index.tsx` and passed into `DataTable`. A `RowDetailModal` dialog opens on row click. A global `useKeyboardShortcuts` hook wires hotkeys app-wide.

```text
Index.tsx (state owner)
 ├── ColumnSettings (popover UI for toggle/reorder/pin)
 └── DataTable (consumes column config, emits row click)
      └── RowDetailModal (dialog showing all fields for one row)

App.tsx
 └── useKeyboardShortcuts (global listener)
```

## Files to Create

### 1. `src/hooks/useColumnSettings.ts`
Custom hook managing three pieces of state, persisted to `localStorage` key `crunch_column_settings`:
- **`visibleColumns: string[]`** -- subset of `columnsList` to display (default: all)
- **`columnOrder: string[]`** -- ordered list (default: same as `columnsList`)
- **`pinnedColumns: string[]`** -- columns frozen to the left (default: none)

Exposes: `toggleColumn`, `reorderColumns`, `togglePin`, `resetAll`, `orderedVisibleColumns` (computed: ordered, filtered by visibility, pinned first).

### 2. `src/components/table/ColumnSettings.tsx`
A `Popover` trigger (gear icon button) placed next to the "CSV Viewer Data" heading. Contains:
- **Visibility tab**: Checklist of all columns with toggles. "Show All" / "Hide All" buttons.
- **Order tab**: Draggable list using `@dnd-kit/core` + `@dnd-kit/sortable` for reordering. Each item shows a grip handle and the column name.
- **Pin tab**: Each column has a pin/unpin toggle icon. Pinned columns are shown at top with a snowflake icon.
- Tabs implemented with the existing `src/components/ui/tabs.tsx`.

### 3. `src/components/table/RowDetailModal.tsx`
A `Dialog` component that receives `row: Record<string, any> | null` and `columns: string[]`. Displays a vertical key-value list of all fields with:
- Column name (bold label) and value (monospace text, with copy button)
- Scrollable if many columns
- Close on Escape (built-in from Dialog primitive)
- Navigation: "Previous" / "Next" buttons + arrow key support to step through rows

### 4. `src/hooks/useKeyboardShortcuts.ts`
Global `useEffect` with `keydown` listener. Shortcuts:
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus a future command palette (for now, no-op placeholder) |
| `Ctrl/Cmd + /` | Open/close keyboard shortcuts help dialog |
| `Escape` | Close any open modal/popover |
| `Ctrl/Cmd + Shift + C` | Toggle column settings popover |
| `J` / `K` (when row detail open) | Navigate prev/next row |

### 5. `src/components/table/KeyboardShortcutsDialog.tsx`
Simple `Dialog` listing all available shortcuts in a two-column table. Triggered by `Ctrl+/` or a `?` button in the header.

## Files to Modify

### 6. `src/pages/Index.tsx`
- Import and use `useColumnSettings(columns)` hook
- Pass `orderedVisibleColumns` and `pinnedColumns` to `DataTable`
- Render `<ColumnSettings>` popover next to the heading
- Track `selectedRow` state and pass to `RowDetailModal`

### 7. `src/components/table/DataTable.tsx`
**Props changes**: Add `pinnedColumns?: string[]`, `onRowClick?: (row, index) => void`.

**Column pinning**: 
- Split columns into `pinnedCols` and `scrollableCols`
- Render pinned columns in a fixed-width left section with `position: sticky; left: 0; z-index: 5` and a right border shadow
- Scrollable columns render in the remaining space

**Row click**: Attach `onClick` to each row div calling `onRowClick(row.original, adjustedIndex)`.

**Grid template update**: Change from uniform `repeat(N, 220px)` to dynamically computed template accounting for pinned vs scrollable columns.

### 8. `src/components/layout/AppHeader.tsx`
- Add a small `?` icon button that opens `KeyboardShortcutsDialog`

### 9. `src/App.tsx`
- Mount `useKeyboardShortcuts` hook at root level

## Dependencies to Install

- `@dnd-kit/core` and `@dnd-kit/sortable` -- for drag-and-drop column reordering

## Implementation Order

1. Install `@dnd-kit` packages
2. Create `useColumnSettings` hook
3. Create `ColumnSettings` popover component
4. Update `DataTable` for column pinning + row click
5. Create `RowDetailModal`
6. Create `useKeyboardShortcuts` + `KeyboardShortcutsDialog`
7. Wire everything together in `Index.tsx` and `App.tsx`

## Technical Details

**localStorage persistence**: Column settings keyed by a hash of the column list, so different datasets get independent configs. On column list change (new upload), missing columns are appended and removed columns are pruned.

**Pinned column rendering**: Uses CSS `position: sticky` with `left: 0` on pinned cells, with a subtle box-shadow on the right edge to indicate frozen boundary. The grid template becomes: `[pinned widths] [scrollable widths]`.

**Row detail navigation**: The modal receives `currentIndex`, `totalRows`, and callbacks `onPrev`/`onNext`. Arrow keys are captured inside the modal via local `keydown` listener.

**Keyboard shortcuts**: Uses `useEffect` with `document.addEventListener('keydown', ...)`. Checks `e.metaKey || e.ctrlKey` for modifier combos. Prevents default browser behavior for captured shortcuts. Only active shortcuts fire; disabled ones (like row nav when no modal) are skipped.

