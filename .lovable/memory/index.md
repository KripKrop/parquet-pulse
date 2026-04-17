# Memory: index.md
Updated: just now

# Project Memory

## Core
Glassmorphism minimalist aesthetic. Floating bottom-right widgets for tasks.
API Base: `https://demoapi.crunchy.sigmoidsolutions.io/`. Bearer tokens required.
Auth: Multi-tenant JWT. `crunch_access_token` and `crunch_refresh_token` in localStorage. Auto-logout after 4h.
`X-Dataset-Version` header (from `/columns`) tracks schema changes and stale AI index warnings.
Uploads: 1.5GB/file max, 5GB total, 5MB chunks, 5 retries. 
Deployed on Vercel (SPA rewrite to index.html).

## Memories
- [Visual Identity](mem://style/visual-identity) — Glassmorphism aesthetic, smooth animations, floating bottom-right widgets
- [Data Loading UX](mem://ux/data-loading-patterns) — Skeleton states, prefetching, and progressive animations for tables
- [Multi-tenant Auth](mem://auth/multi-tenant-jwt-system) — Custom JWT system using localStorage for access/refresh tokens
- [Session Constraints](mem://auth/session-constraints) — Auto-logout after 4 hours, auth required for all routes
- [API Configuration](mem://api/configuration-and-headers) — Hardcoded API URL and required X-Dataset-Version headers
- [Background Tasks](mem://features/background-task-management) — Global React contexts for continuous uploads and CSV downloads
- [Upload Limits](mem://constraints/upload-limits) — 1.5GB file limit, chunked uploads with retries
- [AI Assistant RAG](mem://features/ai-assistant-rag) — Conversational analytics using FAISS index, narrative and tabular intents
- [Onboarding Tour](mem://features/onboarding-tour) — 9-step guided tour with SVG spotlight, mobile drawer auto-open, POST /me/tour-complete
