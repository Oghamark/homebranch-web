# Copilot Instructions

## Commands

- `npm run dev` — Start dev server (Vite + React Router, exposes on network)
- `npm run build` — Production build
- `npm run typecheck` — Generate route types then run `tsc` — **run this to validate changes**

No test framework or linter is configured.

## Architecture

HomeBranch is a personal e-book library SPA built with React 19, React Router v7 (`ssr: false`), Redux Toolkit + RTK Query, and Chakra UI v3.

### Feature-Sliced Design

`src/` follows FSD layer conventions (high → low dependency direction):

```
app/        # Redux store, root layout, route definitions, middleware
pages/      # Full-page components composed from entities/features
features/   # Feature modules (authentication, library)
entities/   # Business entities: book, bookShelf — each has model/, api/, ui/
components/ # Shared UI components (Chakra wrappers, navigation, modals)
shared/     # Config, API clients, type definitions
```

Each layer exposes its public API through an `index.ts` barrel. **Always import from the barrel, never from internal paths.**

### Routing

Routes are defined in `src/app/routes.ts` (the `appDirectory` is `src/app`). Route files in `src/app/routes/` are thin wrappers: they import page components from `src/pages/`, call RTK Query hooks, and handle loading/error/meta. Business logic belongs in `entities/` and `features/`.

Dashboard routes are wrapped in `routes/dashboard/layout.tsx`, which checks `sessionStorage` for `user_id` and redirects to `/login` if absent.

### State Management

- **Redux store** (`src/app/store.ts`): RTK Query reducer + listener middleware
- **Typed hooks** (`src/app/hooks.ts`): Use `useAppDispatch` / `useAppSelector` — never raw `useDispatch`/`useSelector`
- **RTK Query base** (`src/shared/api/rtk-query.ts`): `homebranchApi` with a custom base query that:
  - Uses cookie-based auth (`credentials: 'include'`)
  - Auto-refreshes on 401 using a mutex (prevents concurrent refresh races)
  - Unwraps the backend `Result<T>` envelope so endpoint handlers receive `value` directly
- **Endpoints** are injected via `homebranchApi.injectEndpoints()` in each entity's `api/` folder

### API Layer

Backend response envelope: `Result<T> = { success, value?, error?, message? }`.
- RTK Query (via `homebranchApi`) **unwraps this automatically** — endpoint handlers see `value` directly.
- There is also a separate `authenticationApi` (no auto-unwrap) used only for auth endpoints.

Tag types: `'Book'` and `'BookShelf'`. Use these for `providesTags`/`invalidatesTags` on all book/shelf endpoints.

### Pagination

Paginated list endpoints use RTK Query `infiniteQuery`. Page param is a zero-based offset index; `config.itemsPerPage` (from `VITE_ITEMS_PER_PAGE`) controls page size.

### Provider Hierarchy (`root.tsx`)

`ChakraProvider (Provider)` → `ReduxProvider` → `AuthContextProvider` → App content + `Toaster`

## Key Conventions

- **Import alias**: Use `@/` for all imports — maps to `src/`
- **`verbatimModuleSyntax`**: Type-only imports must use `import type { ... }`
- **Toasts**: Use `ToastFactory` from `@/app/utils/toast_handler` — do not call `toaster` directly outside of that utility
- **RTK error handling**: Use `handleRtkError` from `@/shared/api/rtk-query` in mutation `.catch` or `onQueryStarted` blocks
- **`createBook` mutation**: Serializes the request as `FormData` (not JSON) — the backend expects multipart/form-data for book creation

## Environment Variables (`.env.development`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL for `homebranchApi` (proxied to `/api`) |
| `VITE_AUTHENTICATION_URL` | Base URL for `authenticationApi` (proxied to `/auth`) |
| `VITE_API_ROOT` / `VITE_AUTHENTICATION_ROOT` | Upstream proxy targets for Vite dev server |
| `VITE_ITEMS_PER_PAGE` | Page size for paginated queries |
