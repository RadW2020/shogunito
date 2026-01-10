# E2E Critical Findings (web)

## Common blockers observed
- `status` select without real options (only placeholder), causing skips/timeouts across specs; indicates missing seed/mock of Status data in test env.
- Asset type dropdown appears with placeholder/non-visible option only, so asset creation via UI never sets a valid type and rows never appear.
- Project CRUD flows stall waiting for rows to appear or refresh (create/edit/delete/search), suggesting backend not persisting projects or returning empty lists.
- Occasional 403s from API (`/api/v1/users` seen in logs) hint at auth/permissions misconfiguration for test runs.
- Loading-state assertions flake because requests never transition to disabled/loading when API responses hang.
- With `AUTH_ENABLED=false`, `/register` sometimes fails to load (“Failed to fetch”); consider skipping UI registration and injecting a mock user/tokens when auth is disabled, or ensure web/API servers are up before tests.

## Impacted specs so far
- `projects.spec.ts`: create/edit/delete/search/detail all blocked by empty data/rows and missing status options.
- (Earlier) `navigation.spec.ts` and `pagination.spec.ts` showed status placeholder only; handled via helper skip, but root cause persists.
- `assets.spec.ts`: project seed ok; assetType dropdown empty, asset rows no-show.
- `episodes.spec.ts`: seeds run, but table remains empty; selects often empty.
- `sequences.spec.ts`: even with seeds and auth disabled, registration page fails to load; no data visible.
- `shots.spec.ts`: project/episode/sequence seeds ok; shot API payload fixed (no status), but rows still not visible.

## Suggested remediation
- Seed minimal Status records (and required dependencies) into test DB before web E2E.
- Seed Asset Types so asset creation can set a valid type.
- Consider a shared seed helper that creates a base project/episode/sequence (prototype exists) and reuse it across suites.
- Seed at least one project (or make API create succeed) so table/detail/delete/search scenarios have data.
- Ensure auth for test user is enabled and allowed to hit `/api/v1/users` without 403 during setup.
- If seeding is not feasible, relax tests to skip status selection and to create mock data via UI/API helpers before assertions.
- When auth is disabled, avoid sending Authorization headers (client now does this); if lists are still empty, mock list endpoints in Playwright with seeded data so UI has rows/options.
