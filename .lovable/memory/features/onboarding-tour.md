---
name: Onboarding Tour
description: Guided 9-step tour for first-time users with SVG spotlight, glass tooltips, mobile drawer auto-open, and POST /me/tour-complete persistence
type: feature
---

9-step animated onboarding tour shown automatically to authenticated first-time users on `/`. Uses `TourContext` + `OnboardingTour` (portal to body). Spotlight is an animated SVG mask cutout (spring physics); tooltips use `glass-float` styling. On mobile, steps with `mobileSelector` dispatch a `crunch:tour-mobile-panel` CustomEvent which `Index.tsx` listens to in order to auto-open the relevant Drawer (upload / filters / columns).

Persistence: `POST /me/tour-complete` via `userApi.markTourComplete()` — also writes `crunch_tour_completed=1` to localStorage as a fallback so users aren't re-prompted if the API fails. `User.tour_completed` is read from JWT/login response when present. Reset via Settings → "Replay onboarding tour" button which calls `resetTourLocal()` then `startTour()`.

Targets use `data-tour="..."` attributes: `upload`, `file-select`, `filters`, `columns`, `export`, `ai`, `files-nav`, plus mobile equivalents `mobile-upload`, `mobile-filters`, `mobile-columns`. Keyboard: `→`/`Enter` next, `←` prev, `Esc` skip. Confetti burst on finish.
