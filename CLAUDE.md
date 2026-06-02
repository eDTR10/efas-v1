# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc + vite build
npm run lint      # ESLint (0 warnings allowed)
npm run preview   # Preview production build
```

There are no tests in this project.

## Environment

Copy `.env` and set `VITE_EFAS_API_URL` to the Django backend URL (default `http://localhost:8009/`). The backend must be running for the app to function.

## Architecture

**eFAS** (Electronic Financial Accounting System) is a single-page React app for DICT Regional Office 10 that tracks budget allotments, obligations, and disbursements.

### Tech stack

React 18 + TypeScript + Vite, Tailwind CSS, React Router v6, Axios, Recharts, ExcelJS + file-saver (report export), jsPDF (PDF), Radix UI primitives, SweetAlert2. Path alias `@/` maps to `src/`.

### Routing and auth

All routes are under base path `/efas-v1/`. `src/main.tsx` defines the router. Unauthenticated routes: `/efas-v1/login`. Authenticated routes are nested under `AppLayout` which renders the collapsible sidebar.

Auth is token-based (Djoser): login posts to `token/login/`, stores `efas_token` and `efas_user` in `localStorage`. The API client (`src/plugin/axios.tsx`) attaches the token and auto-redirects to `/efas-v1/login` on 401.

> Note: `src/plugin/efasApi.ts` is an identical duplicate of `src/plugin/axios.tsx`. Prefer `@/plugin/axios` for imports.

### Key screens

| Route | Container | Purpose |
|---|---|---|
| `/dashboard` | `Dashboard.tsx` | Financial overview: allotment/obligation/balance cards, PAP performance chart, SARO tracking table, RAOD breakdown — all data fetched at mount from `received-saro/`, `raod/`, `fund-type/` |
| `/raod` | `RAODMainContainer.tsx` | RAOD (Register of Allotments, Obligations and Disbursements) — expandable rows show obligation entries; side panel shows full detail |
| `/received-saro` | `ReceivedSaroMainContainer.tsx` | Received SARO records flattened into line-item rows; side panel for record detail |
| `/reports` | `ReportsMainContainer.tsx` | Generate RADAI and RCI reports as Excel files via `src/screens/reports/reportGenerator.ts` (ExcelJS) |
| `/settings` | `EfasSettingsContainer.tsx` | Reference data management: PAP codes, Object Descriptions, Fund Types, Class Types |
| `/audit-trail` | `AuditTrailContainer.tsx` | Read-only audit log viewer |
| `/user-management` | `UserManagementContainer.tsx` | User CRUD with roles and office assignments |

### UI patterns

- **Container components** own all state and data fetching. They call a local `fetchAll()` on mount and after every mutation (add/edit/delete).
- **Dialogs** (add/edit) receive `paps`, `fundTypes`, `classTypes`, etc. as props plus `onClose` and `onSaved`/`onDone` callbacks. After save they call the parent's `fetchAll()` via `onSaved`.
- **Side panels** render inline (sticky right, beside the table) on row click. They are resizable via mouse drag using `mousedown`/`mousemove`/`mouseup` listeners. Width is clamped to a `[min, max]` range in state.
- **Tables** use drag-to-scroll horizontally (same mouse event pattern as side panels).
- `<LoadingOverlay>` (`src/screens/received_saro/LoadingOverlay.tsx` or `src/components/loader/LoadingOverlay.tsx`) is shown during CRUD operations via a `crudLoading: string | null` state.
- Font utilities `font-gbold`, `font-gmedium`, `font-gsemibold` come from the custom Geist font in `src/assets/Geist-v1.4.01/`.
- Dark/light theme via `ThemeProvider` (`src/components/theme-provider.tsx`), persisted as `vite-ui-theme` in localStorage.

### API endpoints (backend)

```
token/login/          token/logout/
users/me/
received-saro/        raod/
pap/                  fund-type/         class-type/         object-description/
audit-trail/          (user management endpoints)
```

### Domain glossary

- **SARO** — Special Allotment Release Order
- **RAOD** — Register of Allotments, Obligations and Disbursements
- **PAP** — Program, Activity, Project
- **NCA** — Notice of Cash Allocation (obligation signal on a SARO line item)
- **NTA** — Notice of Transfer of Allocation
- **ORS** — Obligation Request and Status (an entry within a RAOD)
- **RADAI** — Report of Advice to Debit Account Issued
- **RCI** — Report of Checks Issued
- **Fund Type / Class Type / Object Description** — reference data managed in Settings
