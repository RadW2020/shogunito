Act as a senior TypeScript + React architect. You are working in this monorepo:

- Root: /Users/rauljm/codeloper/shogun
- Web app root: /Users/rauljm/codeloper/shogun/apps/web

Goal:
Refactor the web app to a clean, predictable feature-based architecture without migrating to Next.js. Keep Vite + React. Minimize behavior changes. Improve maintainability and separation of concerns.

Rules and constraints:

- Only touch files under /Users/rauljm/codeloper/shogun/apps/web
- Do NOT change server API behavior; keep using the existing NestJS backend
- All code comments in English
- Use Conventional Commits; create a branch named: feat/web-architecture-refactor
- Keep using @shogun/shared types and TAB_CONFIG
- Ensure TypeScript, ESLint, and build pass
- Keep the UI visually the same after refactor

Architecture target (create folders if missing):

- apps/web/src/app/ (app-level providers and config)
- apps/web/src/pages/ (top-level routes or dashboard shell)
- apps/web/src/features/ (feature modules)
  - {projects,episodes,assets,sequences,shots,versions,playlists,notes,users,status}/
    - api/
    - components/
    - hooks/
    - types/
- apps/web/src/shared/
  - api/ (shared API helpers)
  - ui/ (design-system primitives reused: Modal, FormField, etc.)
  - hooks/ (cross-cutting hooks)
  - lib/ (utils)
  - types/ (global types if needed)

Dependencies to add:

- @tanstack/react-query
- @tanstack/react-query-devtools (dev only)
- zustand

Path aliases (tsconfig paths):

- @app/_ -> apps/web/src/app/_
- @features/_ -> apps/web/src/features/_
- @shared/_ -> apps/web/src/shared/_

Step-by-step tasks:

1. Create git branch "feat/web-architecture-refactor".
2. Add deps and wire providers:
   - Install @tanstack/react-query and zustand.
   - Create apps/web/src/app/providers.tsx with a QueryClientProvider and (optionally) ReactQueryDevtools.
   - Update apps/web/src/main.tsx to wrap <App /> with <Providers>.
3. Centralize API client:
   - Move apps/web/src/services/api.ts to apps/web/src/shared/api/client.ts.
   - Export a typed client. Keep the same methods initially (getProjects, getEpisodes, etc.) to avoid breaking changes.
4. Introduce feature example (projects) end-to-end:
   - Create apps/web/src/features/projects/api/useProjects.ts using React Query over the moved client.
   - Update ProjectsTab to consume useProjects() instead of reading data from ShotGrid local state. Keep prop signatures stable for now; internally read from the hook.
5. UI state with Zustand (first slice only):
   - Create apps/web/src/app/stores/uiStore.ts for minimal UI state: activeTab, showFilters, and selectedItems.
   - Wire Toolbar and ShotGrid to read/write those states via the store, reducing local state. Start with activeTab and showFilters only; leave other local states intact for now.
6. Paths and imports:
   - Configure tsconfig paths (@app, @features, @shared) and update imports accordingly for any moved file.
7. Documentation:
   - Add apps/web/README_ARCHITECTURE.md explaining the folder structure, path aliases, coding conventions, and how to add a new feature module (api/hooks/components).
8. Keep behavior and visuals:
   - Ensure ShotGrid renders the same tabs and content.
   - Limit functional migration to the Projects tab as a reference; others can keep using apiService for now.
9. Quality gates:
   - Run type-check, lint, and build; fix issues.
   - Ensure dev server runs and UI behaves the same.

Acceptance criteria:

- The app builds and runs with no type or lint errors.
- Projects tab loads via React Query hook; other tabs remain functional.
- Providers are in place and testable.
- Minimal Zustand store controls activeTab and showFilters across Toolbar and ShotGrid.
- API client is under shared/api with the same surface for now.
- Imports use @app, @features, @shared where applicable.
- README_ARCHITECTURE.md exists and is clear.

Deliverables and commits (Conventional Commits):

- chore(web): add react-query and zustand, configure providers
- refactor(web): introduce feature-based folders and path aliases
- refactor(web): move API client to shared/api and keep method parity
- feat(web-projects): add useProjects with React Query and wire ProjectsTab
- feat(web): add minimal ui store (activeTab, showFilters) with Zustand
- docs(web): add README_ARCHITECTURE with conventions

Do not implement new business features. Keep comments in English. Keep the UI and behavior identical except the internal wiring for the Projects tab. Ensure all changes are confined to apps/web.
