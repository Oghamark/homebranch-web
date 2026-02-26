# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (Vite + React Router, exposes on network)
- `npm run build` — Production build
- `npm run start` — Serve production build
- `npm run typecheck` — Generate route types then run `tsc` (run this to validate changes)

No test framework is configured. No linter is configured.

## Architecture

**HomeBranch** is a personal e-book library web app built with React 19, React Router v7 (SPA mode, `ssr: false`), Redux Toolkit + RTK Query, and Chakra UI v3.

### Feature-Sliced Design (FSD)

The `src/` directory follows FSD conventions:

- **`app/`** — Root layout, Redux store, route definitions, middleware, global styles
- **`pages/`** — Full-page components composed from entities/features
- **`features/`** — Feature modules (currently: authentication)
- **`entities/`** — Business entities (`book`, `bookShelf`) with `model/`, `api/`, `ui/` subfolders
- **`components/`** — Shared UI components (navigation, form fields, modals, Chakra wrappers)
- **`shared/`** — Config, API clients, type definitions

Each module exposes its public API through `index.ts` barrel exports. Import from the barrel, not internal paths.

### Routing

Routes are defined in `src/app/routes.ts` using React Router v7's `route()`/`layout()`/`index()` helpers. Route files in `src/app/routes/` are **thin wrappers** — they import page components from `src/pages/`, call RTK Query hooks, and handle loading/error/meta concerns. Business logic belongs in `entities/` and `features/`.

Dashboard routes are wrapped in `routes/dashboard/layout.tsx` which provides an auth guard (checks `sessionStorage` for `user_id`, redirects to `/login`) and a sidebar navigation layout.

### State Management

- **Redux store** (`src/app/store.ts`): RTK Query reducer + listener middleware
- **Typed hooks** (`src/app/hooks.ts`): Always use `useAppDispatch` and `useAppSelector`
- **RTK Query** (`src/shared/api/rtk-query.ts`): `homebranchApi` with a custom base query that:
  - Uses cookie-based auth (`credentials: 'include'`)
  - Handles 401 with mutex-protected token refresh
  - Unwraps the backend `Result<T>` envelope (`{ success, value, error, message }`) so endpoints receive `value` directly
- **Entity endpoints** are defined via `homebranchApi.injectEndpoints()` (see `src/entities/book/api/api.ts`)

### API Layer — Migration In Progress

- **`book` entity**: Fully migrated to RTK Query (`src/entities/book/api/api.ts`)
- **`bookShelf` entity**: Still uses raw axios (`src/entities/bookShelf/api/`)
- **Auth**: Uses a separate `authenticationApi` and `authenticationAxiosInstance`

Backend response envelope: `Result<T> = { success, value?, error?, message? }`. RTK Query unwraps this automatically; axios callers must unwrap manually.

### Provider Hierarchy (root.tsx)

`ChakraProvider` → `ColorModeProvider` → `ReduxProvider` → `AuthContextProvider` → App content + Toaster

## Key Conventions

- **Import alias**: Use `@/` prefix for all imports (maps to `src/`)
- **`verbatimModuleSyntax`**: Type-only imports must use `import type { ... }`
- **Strict TypeScript**: `strict: true` in tsconfig
- **Chakra UI v3**: All UI uses Chakra primitives. Toasts via `ToastFactory` in `src/app/utils/toast_handler.ts`
- **Tag-based cache invalidation**: RTK Query uses `'Book'` tag type for automatic refetching

## Environment

Dev environment variables are in `.env.development`:
- `VITE_BACKEND_URL` / `VITE_AUTHENTICATION_URL` — API base URLs
- Vite dev server proxies `/api` and `/auth` to the backend
