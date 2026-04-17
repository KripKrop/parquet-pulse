

# Onboarding Tour — Refined with Detailed Step Content

Refining the previously approved plan with much richer step content. Architecture, components, API integration, and file list remain identical to the prior plan — only the **step copy, targeting, and per-step behavior** are expanded below.

## Expanded Tour Steps (8 total, was 5)

Each step now has: a clear **title**, a **2–3 sentence description** that teaches *what it does + why it matters + a concrete tip*, an **icon**, a **target selector**, **placement preference**, and any **per-step side effects** (e.g. auto-open a drawer so the highlighted element is actually visible).

| # | Step | Target | Placement | Side Effect |
|---|------|--------|-----------|-------------|
| 1 | **Welcome** | centered modal | center | none |
| 2 | **Upload your data** | `[data-tour="upload"]` | right (desktop) / top (mobile, opens Upload drawer) | mobile: open upload drawer |
| 3 | **Browse your files** | `[data-tour="files-nav"]` (Files nav link) | bottom | none |
| 4 | **Filter across files** | `[data-tour="file-select"]` | right / top | mobile: open filters drawer |
| 5 | **Slice by column** | `[data-tour="filters"]` | right / top | keep filters drawer open on mobile |
| 6 | **Customize columns** | `[data-tour="columns"]` (ColumnSettings button) | bottom-left | none |
| 7 | **Ask the AI** | `[data-tour="ai"]` (AI nav link) | bottom | none |
| 8 | **Export to CSV** | `[data-tour="export"]` (DownloadCsv button) | bottom-left | none |
| 9 | **You're ready** | centered modal | center | calls `/me/tour-complete` |

### Detailed step copy

**Step 1 — Welcome to Crunchy** (icon: `Sparkles`)
> "Crunchy turns your CSVs into an explorable dataset. In 90 seconds, we'll show you how to upload data, filter it, query it with AI, and export results. You can skip anytime — replay this tour from Settings."
> Buttons: `Skip` · `Start tour` (primary)

**Step 2 — Upload your data** (icon: `Upload`)
> "Drag and drop a CSV here, or click to browse. Files up to **1.5 GB** are split into 5 MB chunks and uploaded in the background — you can keep working while they process. Each upload becomes a queryable file in your dataset."
> Tip chip: *"Tip: uploads survive page refreshes."*

**Step 3 — Browse your files** (icon: `FolderOpen`)
> "The Files page lists every CSV in your tenant. Sort by name, date, size, or row count, search by filename, and select multiple files to bulk-delete, export metadata, or compare two schemas side by side."

**Step 4 — Filter across files** (icon: `Files`)
> "Pick which uploaded files contribute to the current view. Selecting two or more files lets you query them as one merged dataset — useful when monthly exports share the same schema."

**Step 5 — Slice by column** (icon: `Filter`)
> "Add filters on any column: ranges for numbers and dates, multi-select for categories, free text for strings. All filters sync to the URL, so you can bookmark or share an exact view of your data."
> Tip chip: *"Tip: filters update the table and AI context together."*

**Step 6 — Customize columns** (icon: `Columns3`)
> "Show, hide, reorder, and pin columns. Your layout is saved per-dataset, so the table looks the way you want every time you return."

**Step 7 — Ask the AI** (icon: `Sparkles`)
> "Ask questions in plain English — *'top 10 customers by revenue this quarter'* or *'what changed between March and April?'*. The AI uses your current filters as context and can return narrative answers or live tables you can drill into."
> Warning chip (only if AI index stale): *"Rebuild the index after large uploads."*

**Step 8 — Export to CSV** (icon: `Download`)
> "Download the current filtered view as a CSV. Large exports run in the background — a floating widget shows progress, and you can keep filtering or start a new export while it's working."

**Step 9 — You're all set 🎉** (icon: `CheckCircle2`)
> "That's the tour. You can replay it anytime from **Settings → Replay onboarding tour**. Now upload your first file and start exploring."
> Buttons: `Finish` (primary, triggers confetti + API call)

## Per-step behavior added

- **`onEnter` hook per step**: each step config can declare `onEnter()` to open a drawer, navigate, or scroll. Mobile steps 2/4/5 use this to auto-open the relevant bottom-sheet drawer so the highlighted target is actually visible.
- **`onExit` hook**: closes drawers opened by the tour when moving forward (unless next step needs it).
- **Tip chips**: optional `tip` field in step config renders below description as a `Badge variant="outline"` with `Lightbulb` icon — only when present.
- **Warning chips**: conditional, e.g. step 7 reads AIContext for `indexStale` and shows a warning chip.
- **Per-step icon**: rendered in tooltip header as a small gradient-bg circle — visually anchors each step.

## Step config shape (in `OnboardingTour.tsx`)

```ts
type TourStep = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  selector?: string;          // omit for centered modal
  placement?: "top" | "bottom" | "left" | "right" | "center";
  tip?: string;
  onEnter?: (ctx: TourCtx) => void | Promise<void>;
  onExit?: (ctx: TourCtx) => void;
  mobileSelector?: string;    // override target on mobile
};
```

## Files Summary (unchanged from prior plan)

| File | Action |
|------|--------|
| `src/contexts/TourContext.tsx` | Create |
| `src/components/onboarding/OnboardingTour.tsx` | Create (with 9-step config) |
| `src/components/onboarding/TourSpotlight.tsx` | Create |
| `src/components/onboarding/TourTooltip.tsx` | Create (now renders icon + tip chip) |
| `src/components/onboarding/TourProgress.tsx` | Create |
| `src/services/userApi.ts` | Create |
| `src/types/auth.ts` | Modify |
| `src/contexts/AuthContext.tsx` | Modify |
| `src/App.tsx` | Modify |
| `src/pages/Index.tsx` | Modify (add `data-tour` on upload, file-select, filters, columns, export) |
| `src/components/layout/AppHeader.tsx` | Modify (add `data-tour="ai"` and `data-tour="files-nav"`) |
| `src/pages/Settings.tsx` | Modify (Replay tour button) |

Everything else (visual design, spotlight animation, glass-card tooltip, confetti finish, accessibility, edge cases, z-index hierarchy, persistence) stays exactly as previously approved.

