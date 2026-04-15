

# Implementation Plan: Responsive Mobile Layout

## Overview

Three mobile-specific enhancements for screens < 768px, using the existing `useIsMobile()` hook. Desktop layout remains completely unchanged.

## Current State

- **AppHeader**: Horizontal nav bar with nav links + user info. No hamburger menu -- everything overflows on small screens.
- **Index page**: 12-column grid with a 4-col sidebar (Upload + FileMultiSelect + FiltersPanel) and 8-col main area (DataTable). On mobile this stacks vertically but takes up massive space.
- **Files page**: Full table with 7 columns (checkbox, file, uploaded, size, rows, status, actions). Unusable on narrow screens.
- **Existing**: `useIsMobile()` hook (768px breakpoint), `Sheet` component, `Drawer` component (vaul-based bottom drawer).

## Feature 1: Collapsible Mobile Header/Navigation

**Problem**: The nav bar shows all links + tenant info + user email horizontally. On mobile it overflows.

**Solution**: On mobile, collapse the nav into a hamburger menu using the existing `Sheet` component (slides from left).

**Changes to `src/components/layout/AppHeader.tsx`**:
- Import `useIsMobile`, `Sheet`, `SheetContent`, `SheetTrigger`, `Menu` icon
- Desktop (>768px): render current nav as-is
- Mobile (<768px): 
  - Show logo + hamburger icon (`Menu`) + compact user badge
  - `Sheet` opens from the left with vertical nav links, AI status badge, tenant name, email, and logout button
  - Each nav link closes the sheet on click via `onOpenChange`

## Feature 2: Bottom Sheet for Filters (Index Page)

**Problem**: The sidebar (Upload + Filters) takes up the entire screen width on mobile before the user even sees data.

**Solution**: On mobile, hide the sidebar and show a sticky bottom bar with action buttons that open bottom sheets (using the existing `Drawer` component from vaul).

**Changes to `src/pages/Index.tsx`**:
- Import `useIsMobile`, `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`
- Add state: `mobilePanel: "upload" | "filters" | null`
- Desktop: render current grid layout unchanged
- Mobile:
  - Hide `<aside>` entirely
  - Show `DataTable` full-width
  - Render a sticky bottom bar (`fixed bottom-0 left-0 right-0 z-40`) with 3-4 icon buttons: Upload, Filters, Files, Column Settings
  - Each button opens a `Drawer` (bottom sheet) containing the respective panel
  - Filter bottom sheet contains `FileMultiSelect` + `FiltersPanel`
  - Upload bottom sheet contains `UploadPanel`
  - Column settings bottom sheet contains `ColumnSettings` (rendered as inline content instead of popover on mobile)
  - Bottom bar styled with glassmorphism to match existing aesthetic
  - Add `pb-16` to main content to prevent the fixed bar from covering content

## Feature 3: Swipeable File Cards (Files Page)

**Problem**: The 7-column file table is unreadable on mobile. Rows are too wide.

**Solution**: On mobile, replace the table with a card-based layout. Each file renders as a compact card showing key info, with swipe-to-reveal actions.

**Changes to `src/pages/Files.tsx`**:
- Import `useIsMobile`
- Desktop: render current `Table` unchanged
- Mobile: render a vertical list of cards instead of `<Table>`
  - Each card shows: filename (bold), file type badge, relative upload time, size, row count
  - Tap card to open `FileDetailsDrawer`
  - Checkbox overlay in top-left corner for multi-select
  - Quick action buttons (filter, delete) visible below the metadata
  - Cards use the existing `glass-card` styling

**New component `src/components/files/FileCard.tsx`**:
- Props: `file`, `selected`, `onToggleSelect`, `onView`, `onFilter`, `onDelete`, `onCopy`
- Renders a compact card with file info and action buttons
- Touch-optimized tap targets (min 44px)

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/layout/AppHeader.tsx` | Modify | Hamburger menu with Sheet on mobile |
| `src/pages/Index.tsx` | Modify | Bottom sheet drawers for filters/upload on mobile, sticky bottom bar |
| `src/pages/Files.tsx` | Modify | Card layout on mobile instead of table |
| `src/components/files/FileCard.tsx` | Create | Mobile file card component |

No new dependencies. Uses existing `Sheet`, `Drawer`, `useIsMobile()`.

## Implementation Order

1. Update `AppHeader` with mobile hamburger menu
2. Create `FileCard` component
3. Update `Files.tsx` with mobile card layout
4. Update `Index.tsx` with bottom sheet filters and sticky bottom bar

## Technical Details

**Bottom bar z-index**: `z-40` (below header at `z-50`, above content). The floating upload/download widgets are bottom-right -- the bottom bar will account for them with appropriate spacing.

**Drawer snap points**: The filter drawer will use `snapPoints={[0.5, 0.85]}` so users can half-open or full-open the filter panel. Upload drawer uses a fixed height.

**No horizontal swipe gestures**: After reviewing complexity vs. value, file cards will use visible action buttons instead of swipe-to-reveal. This avoids conflicts with page scroll and is more discoverable. The cards themselves are "swipeable" in the sense that the card list is vertically scrollable with momentum -- matching native mobile UX.

**Responsive breakpoint**: All checks use `useIsMobile()` (768px). Between 768-1024px the existing responsive grid (`lg:grid-cols-12`) already handles the layout adequately.

