# Playwright E2E Tests for Shogun UI

Comprehensive end-to-end UI/UX tests using Playwright for the Shogun web application.

## 📁 Test Structure

```
e2e/
├── helpers/
│   └── test-helpers.ts        # Test utilities, fixtures, and helpers
├── auth.spec.ts               # Authentication flow tests
├── projects.spec.ts           # Project management CRUD tests
├── episodes.spec.ts           # Episode management CRUD tests
├── assets.spec.ts             # Asset management CRUD tests
├── sequences.spec.ts          # Sequence management CRUD tests
├── shots.spec.ts              # Shot management CRUD tests
├── versions.spec.ts            # Version viewing and filtering tests
├── playlists.spec.ts          # Playlist management CRUD tests
├── notes.spec.ts              # Notes management tests
├── status.spec.ts             # Status management CRUD tests
├── navigation.spec.ts         # Navigation and interaction tests
├── accessibility.spec.ts      # Accessibility and responsive tests
└── README.md                  # This file
```

## 🚀 Running Tests

### Prerequisites

Before running E2E tests, you need:

1. **Playwright browsers installed** (first time only):

   ```bash
   npm run playwright:install
   ```

2. **Test infrastructure running** (PostgreSQL and MinIO):

   ```bash
   # Option 1: Use the helper script (recommended)
   ./e2e/run-e2e-tests.sh

   # Option 2: Start manually
   docker-compose -f docker-compose.test.yml up -d
   ```

### Run All Tests

**Recommended way** (handles infrastructure automatically):

```bash
./e2e/run-e2e-tests.sh
```

**Manual way** (requires infrastructure already running):

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Run Tests for Specific Browser

```bash
npm run test:e2e:chrome
npm run test:e2e:firefox
```

### Run Specific Test File

```bash
npx playwright test auth.spec.ts
```

### Run Specific Test

```bash
npx playwright test -g "should login with valid credentials"
```

### View Test Report

```bash
npm run test:e2e:report
```

## 📊 Test Coverage

### Authentication Tests (`auth.spec.ts`)

- ✅ User registration with validation
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Password confirmation matching
- ✅ Duplicate email/username prevention
- ✅ User login flow
- ✅ Invalid credentials handling
- ✅ Empty field validation
- ✅ Logout functionality
- ✅ Protected route access
- ✅ Session persistence across reloads
- ✅ Session sharing between tabs
- ✅ User interface display
- ✅ Form validation UI
- ✅ Keyboard navigation
- ✅ Loading states

**Total: 30+ tests**

### Project Management Tests (`projects.spec.ts`)

- ✅ Create project with all fields
- ✅ Required field validation
- ✅ Duplicate code prevention
- ✅ All status options (active, archived, completed)
- ✅ Optional fields handling
- ✅ Modal close/cancel
- ✅ View projects in table
- ✅ Detail panel display
- ✅ Table sorting
- ✅ Edit project functionality
- ✅ Edit cancellation
- ✅ Delete single project
- ✅ Delete multiple projects
- ✅ Search by name
- ✅ Filter by status
- ✅ Refresh data
- ✅ Add notes to project
- ✅ Note badge display
- ✅ Keyboard shortcuts (Escape)
- ✅ Loading states (create, refresh)

**Total: 25+ tests**

### Episodes Management Tests (`episodes.spec.ts`)

- ✅ Create episode with all fields
- ✅ Required field validation
- ✅ Duplicate code prevention
- ✅ All status options support
- ✅ Optional fields handling
- ✅ View episodes in table
- ✅ Detail panel display
- ✅ Table sorting
- ✅ Edit episode functionality
- ✅ Delete episode
- ✅ Search by name
- ✅ Filter by project and status
- ✅ Add notes to episode

**Total: 15+ tests**

### Assets Management Tests (`assets.spec.ts`)

- ✅ Create asset with all fields
- ✅ Required field validation
- ✅ All asset types (character, prop, environment, vehicle, script)
- ✅ Optional fields handling
- ✅ View assets in table
- ✅ Detail panel display
- ✅ Table sorting
- ✅ Edit asset functionality
- ✅ Delete asset
- ✅ Search by name
- ✅ Filter by type and project
- ✅ Add notes to asset

**Total: 15+ tests**

### Sequences Management Tests (`sequences.spec.ts`)

- ✅ Create sequence with all fields
- ✅ Required field validation
- ✅ Optional fields handling
- ✅ View sequences in table
- ✅ Detail panel display
- ✅ Edit sequence functionality
- ✅ Delete sequence
- ✅ Search by name
- ✅ Filter by episode
- ✅ Add notes to sequence

**Total: 12+ tests**

### Shots Management Tests (`shots.spec.ts`)

- ✅ Create shot with all fields
- ✅ Required field validation
- ✅ All shot types (establishing, medium, closeup, detail)
- ✅ Optional fields handling
- ✅ View shots in table
- ✅ Detail panel display
- ✅ Edit shot functionality
- ✅ Delete shot
- ✅ Search by name
- ✅ Filter by sequence
- ✅ Add notes to shot

**Total: 13+ tests**

### Versions Management Tests (`versions.spec.ts`)

- ✅ Display versions in table view
- ✅ Display versions in grid view
- ✅ Toggle between table and grid view
- ✅ Persist view mode preference
- ✅ Filter by latest only
- ✅ Filter by entity type
- ✅ Filter by status
- ✅ Search by code
- ✅ Show no results message
- ✅ Version detail view
- ✅ Sort by date

**Total: 11+ tests**

### Playlists Management Tests (`playlists.spec.ts`)

- ✅ Create playlist with all fields
- ✅ Required field validation
- ✅ Optional fields handling
- ✅ View playlists in table
- ✅ Detail panel display
- ✅ Edit playlist functionality
- ✅ Delete playlist
- ✅ Search by name
- ✅ Filter by project
- ✅ Open playlist player modal
- ✅ Add notes to playlist

**Total: 12+ tests**

### Notes Management Tests (`notes.spec.ts`)

- ✅ Display notes in table/list
- ✅ Show note details
- ✅ Create general note
- ✅ Validation for empty content
- ✅ Filter by entity type
- ✅ Filter by status
- ✅ Filter by date range
- ✅ Search by content
- ✅ Edit existing note
- ✅ Delete note
- ✅ Sort by date and entity

**Total: 12+ tests**

### Status Management Tests (`status.spec.ts`)

- ✅ Display statuses in table
- ✅ Show status details
- ✅ Create status with all fields
- ✅ Required field validation
- ✅ Color format validation
- ✅ Support all applicable entity types
- ✅ Edit status functionality
- ✅ Update status color
- ✅ Delete status
- ✅ Search by name
- ✅ Filter by applicable entity
- ✅ Filter by active/inactive
- ✅ Show status color badge

**Total: 14+ tests**

### Navigation & Interaction Tests (`navigation.spec.ts`)

- ✅ Navigate between all 10 tabs
- ✅ Tab state syncs with URL
- ✅ Tab persistence on reload
- ✅ Tab-specific content display
- ✅ Keyboard arrow navigation
- ✅ Toggle filter bar
- ✅ Cascading filter relationships
- ✅ Reset filters
- ✅ Filter persistence in localStorage
- ✅ Open/close detail panel
- ✅ Tab-specific detail content
- ✅ Selected items count
- ✅ Select all/deselect all
- ✅ Search functionality
- ✅ No results message
- ✅ Version view mode toggle (table/grid)
- ✅ View mode persistence
- ✅ UI state persistence
- ✅ State clearing on logout
- ✅ Responsive window resize
- ✅ Loading indicators
- ✅ Tab switching loading

**Total: 30+ tests**

### Accessibility & Responsive Tests (`accessibility.spec.ts`)

#### Keyboard Navigation

- ✅ Full keyboard navigation on login
- ✅ Tab navigation through forms
- ✅ Arrow key navigation in tabs
- ✅ Tab through table elements
- ✅ Escape key to close modal
- ✅ Enter key to submit forms
- ✅ Shift+Tab for reverse navigation

#### Screen Reader Support

- ✅ ARIA labels on interactive elements
- ✅ ARIA roles on UI sections
- ✅ Accessible form labels
- ✅ Modal announcements (role="dialog")
- ✅ Alt text on images

#### Focus Management

- ✅ Focus trap within modals
- ✅ Focus return after modal close
- ✅ Visible focus indicators

#### Responsive Design

- ✅ Mobile (375x667) - iPhone SE
  - Login form display
  - Main content display
  - Horizontal overflow handling
  - Modal display
  - Navigation accessibility
- ✅ Tablet (768x1024) - iPad
  - Space utilization
  - Touch interactions
- ✅ Desktop (1920x1080)
  - Full layout with detail panel
  - All table columns visible
- ✅ Orientation changes (portrait/landscape)

#### Additional A11y Tests

- ✅ Color contrast
- ✅ Text scaling support
- ✅ Basic accessibility checks
- ✅ Touch event support
- ✅ Swipe gestures
- ✅ Reduced motion preference

**Total: 40+ tests**

## 🧰 Test Helpers and Utilities

### Authentication Helpers

- `auth.register(userData?)` - Register a new user
- `auth.login(email, password)` - Login with credentials
- `auth.logout()` - Logout current user
- `auth.isAuthenticated()` - Check if user is logged in

### Navigation Helpers

- `nav.goToTab(tabName)` - Navigate to a specific tab
- `nav.openAddModal()` - Open the add entity modal
- `nav.closeModal()` - Close current modal
- `nav.toggleFilters()` - Toggle filter bar
- `nav.refreshData()` - Refresh current data
- `nav.openDetailPanel(itemCode)` - Open detail panel for item

### Form Helpers

- `form.fillField(name, value)` - Fill a form field
- `form.submitForm()` - Submit the current form
- `form.expectValidationError(fieldName)` - Assert validation error
- `form.expectFieldValue(name, value)` - Assert field value

### Table Helpers

- `table.getRowCount()` - Get number of rows
- `table.findRowByText(text)` - Find row containing text
- `table.clickRowAction(rowText, action)` - Click action button in row
- `table.selectRow(rowText)` - Select a specific row
- `table.selectAllRows()` - Select all rows
- `table.sortByColumn(columnName)` - Sort by column
- `table.expectRowExists(text)` - Assert row exists
- `table.expectRowNotExists(text)` - Assert row doesn't exist

### Modal Helpers

- `modal.isOpen()` - Check if modal is open
- `modal.expectTitle(title)` - Assert modal title
- `modal.close()` - Close modal
- `modal.submit()` - Submit modal form

### Toast/Notification Helpers

- `toast.expectSuccess(message?)` - Expect success toast
- `toast.expectError(message?)` - Expect error toast
- `toast.waitForToastToDisappear()` - Wait for toast to dismiss

### Data Factories

- `createProjectData()` - Generate test project data
- `createEpisodeData()` - Generate test episode data
- `createAssetData()` - Generate test asset data
- `createSequenceData()` - Generate test sequence data
- `createShotData()` - Generate test shot data

### Accessibility Helpers

- `checkA11y(page)` - Run basic accessibility checks
- `takeSnapshot(page, name)` - Take screenshot for visual regression

## 🎯 Test Patterns

### Basic Test Structure

```typescript
import { test, expect } from './helpers/test-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register(); // Authenticate before each test
  });

  test('should do something', async ({ page, nav, form }) => {
    // Navigate
    await nav.goToTab('Projects');

    // Interact
    await nav.openAddModal();
    await form.fillField('code', 'TEST');

    // Assert
    await expect(page.locator('input[name="code"]')).toHaveValue('TEST');
  });
});
```

### Testing Authentication

```typescript
test('should login successfully', async ({ page, auth, toast }) => {
  const user = { email: 'test@test.com', password: 'Test123456!' };

  await auth.register(user);
  await auth.logout();
  await auth.login(user.email, user.password);

  await toast.expectSuccess();
  await expect(page).toHaveURL('/');
});
```

### Testing CRUD Operations

```typescript
test('should create and delete project', async ({ nav, form, modal, table, toast }) => {
  await nav.goToTab('Projects');

  // Create
  await nav.openAddModal();
  await form.fillField('code', 'PRJ123');
  await form.fillField('name', 'Test Project');
  await form.fillField('status', 'active');
  await modal.submit();

  await toast.expectSuccess();
  await table.expectRowExists('PRJ123');

  // Delete
  await table.selectRow('PRJ123');
  await page.click('button:has-text("Delete")');

  await toast.expectSuccess();
  await table.expectRowNotExists('PRJ123');
});
```

### Testing Responsive Design

```typescript
test.describe('Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display properly on mobile', async ({ page, auth }) => {
    await auth.register();

    await expect(page.locator('table')).toBeVisible();
  });
});
```

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)

- **Base URL**: `http://localhost:5173` (Vite dev server)
- **API URL**: `http://localhost:3000` (NestJS API server)
- **Timeout**: 60s per test
- **Retries**: 2 on CI, 0 locally
- **Workers**: Parallel on local, sequential on CI
- **Browsers**: Google Chrome, Firefox
- **Screenshots**: On failure only
- **Videos**: On failure only
- **Traces**: On first retry
- **Web Servers**:
  - Frontend (Vite) - started automatically
  - Backend API - started automatically with test environment variables

### Test Infrastructure (`docker-compose.test.yml`)

The tests require the following services to be running:

- **PostgreSQL**: Port 5434, database `shogun_test`
- **MinIO**: Port 9012 (API), 9013 (Console)
- **API Server**: Port 3000 (started automatically by Playwright with test config)

### Environment Variables

- `PLAYWRIGHT_BASE_URL` - Override base URL for frontend
- `CI` - Enable CI mode (retries, sequential execution)
- `VITE_API_URL` - API base URL (defaults to `http://localhost:3000`)

## 📈 Best Practices

### DO ✅

- Use test helpers for common operations
- Use data factories for test data
- Test both happy paths and error cases
- Test keyboard navigation
- Test responsive design
- Test accessibility
- Write descriptive test names
- Use `beforeEach` for authentication
- Clean up test data when possible (see Data Cleanup section below)
- Use expect assertions liberally

### DON'T ❌

- Hard-code test data IDs
- Rely on exact timing (use waitFor\* methods)
- Skip authentication tests
- Ignore accessibility
- Test only desktop viewports
- Use sleep() instead of proper waits
- Share state between tests
- Leave commented-out tests
- Skip error scenarios

## 🐛 Debugging

### UI Mode (Best for Development)

```bash
npm run test:e2e:ui
```

- Step through tests visually
- See DOM snapshots
- View test timeline
- Inspect selectors

### Debug Mode

```bash
npm run test:e2e:debug
```

- Opens DevTools
- Pauses on failures
- Step through with debugger

### Headed Mode

```bash
npm run test:e2e:headed
```

- See browser while tests run
- Good for understanding failures

### Screenshots and Videos

Located in `playwright-report/` and `test-results/` after test run.

### Trace Viewer

```bash
npx playwright show-trace trace.zip
```

## 📊 Coverage Goals

- ✅ **Authentication**: 100% of flows
- ✅ **CRUD Operations**: All entities (Projects, Episodes, Assets, etc.)
- ✅ **Navigation**: All 10 tabs
- ✅ **Forms**: All validation rules
- ✅ **Interactions**: Filters, search, sort, select
- ✅ **Accessibility**: WCAG 2.1 Level AA basics
- ✅ **Responsive**: Mobile, Tablet, Desktop
- ✅ **Error Handling**: All error states
- ✅ **Loading States**: All async operations

**Total Tests**: 450+ comprehensive UI/UX tests covering all major entities, workflows, edge cases, advanced features, permissions, themes, and keyboard shortcuts

### Additional Test Suites

#### Workflows Tests (`workflows.spec.ts`)

- ✅ Full production pipeline workflow
- ✅ Project-Asset linking workflow
- ✅ Notes workflow across entities
- ✅ Playlist creation workflow
- ✅ Bulk operations workflow
- ✅ Status management workflow
- ✅ Cascading filter workflow
- ✅ Data persistence workflow

**Total: 8+ workflow tests**

#### Error Handling Tests (`error-handling.spec.ts`)

- ✅ Network timeout handling
- ✅ 500 server error handling
- ✅ 404 not found handling
- ✅ Long input validation
- ✅ Special characters handling
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Concurrent operations
- ✅ Empty state handling
- ✅ Boundary conditions
- ✅ State management errors
- ✅ Modal/UI errors
- ✅ Data integrity errors

**Total: 20+ error handling tests**

#### File Upload Tests (`file-uploads.spec.ts`)

- ✅ Version file upload
- ✅ File type validation
- ✅ File size validation
- ✅ Upload progress display
- ✅ Thumbnail upload
- ✅ Image format validation
- ✅ Note attachment upload
- ✅ Drag and drop support
- ✅ Multiple file upload
- ✅ Upload error handling
- ✅ Image preview

**Total: 12+ file upload tests**

#### Performance Tests (`performance.spec.ts`)

- ✅ Page load performance
- ✅ Table data loading
- ✅ Large dataset handling
- ✅ Modal open/close performance
- ✅ Search performance
- ✅ Filter performance
- ✅ Tab switching performance
- ✅ Data caching
- ✅ Rendering performance
- ✅ Memory management
- ✅ Network optimization
- ✅ Animation performance

**Total: 15+ performance tests**

#### Integration Tests (`integration.spec.ts`)

- ✅ Project-Episode integration
- ✅ Episode-Sequence integration
- ✅ Sequence-Shot integration
- ✅ Project-Asset integration
- ✅ Cross-entity notes
- ✅ Version-Entity integration
- ✅ Playlist-Version integration
- ✅ Status-Entity integration
- ✅ Cascading deletes

**Total: 9+ integration tests**

#### Advanced Search Tests (`search-advanced.spec.ts`)

- ✅ Multi-field search
- ✅ Partial match search
- ✅ Case-insensitive search
- ✅ Search with filters
- ✅ Search result highlighting
- ✅ Search history
- ✅ Wildcard searches
- ✅ Phrase searches
- ✅ Cross-tab search
- ✅ Search performance

**Total: 12+ advanced search tests**

#### Pagination Tests (`pagination.spec.ts`)

- ✅ Pagination controls display
- ✅ Next/Previous navigation
- ✅ Specific page navigation
- ✅ Page size selection
- ✅ Pagination with filters
- ✅ Infinite scroll
- ✅ Pagination state display
- ✅ Pagination accessibility

**Total: 12+ pagination tests**

#### Advanced Sorting Tests (`sorting-advanced.spec.ts`)

- ✅ Column sorting (ascending/descending)
- ✅ Multi-column sorting
- ✅ Sort indicators
- ✅ Sort persistence
- ✅ Sort with filters
- ✅ Date sorting
- ✅ Numeric sorting
- ✅ Sort accessibility

**Total: 10+ sorting tests**

#### Permissions and Roles Tests (`permissions-roles.spec.ts`)

- ✅ Role-based access control
- ✅ Member role restrictions
- ✅ Admin role full access
- ✅ Viewer role read-only
- ✅ Permission-based UI elements
- ✅ Version approval permissions
- ✅ User management permissions
- ✅ Status management permissions

**Total: 10+ permission tests**

#### Dark Mode Tests (`dark-mode.spec.ts`)

- ✅ Dark mode toggle functionality
- ✅ Theme persistence in localStorage
- ✅ ARIA labels for accessibility
- ✅ Keyboard activation
- ✅ Theme persistence across sessions
- ✅ System preference detection
- ✅ Theme transitions
- ✅ Theme in different views
- ✅ Theme accessibility and contrast

**Total: 10+ dark mode tests**

#### Keyboard Shortcuts Tests (`keyboard-shortcuts.spec.ts`)

- ✅ Modal shortcuts (Escape, Ctrl+Enter)
- ✅ Navigation shortcuts (Arrow keys, Home/End)
- ✅ Search shortcuts (Ctrl+K, Escape)
- ✅ Table navigation shortcuts
- ✅ Action shortcuts (Ctrl+N, F5, ?)
- ✅ Focus management shortcuts
- ✅ Copy/Paste shortcuts
- ✅ Undo/Redo shortcuts
- ✅ Shortcut conflicts handling

**Total: 12+ keyboard shortcut tests**

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npm run playwright:install

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 🎨 Visual Regression Testing

While not currently implemented, Playwright supports visual regression testing:

```typescript
await expect(page).toHaveScreenshot('homepage.png');
```

To add visual regression:

1. Take baseline screenshots
2. Compare on each run
3. Review differences
4. Update baselines as needed

## 📝 Maintenance

### Updating Tests

- Keep selectors in helpers/test-helpers.ts
- Update data factories when DTOs change
- Add new helpers for new features
- Keep README.md updated with new tests

### Running Tests Locally

1. Start dev server: `npm run dev`
2. In another terminal: `npm run test:e2e:ui`
3. Select tests to run
4. View results in UI

### Running Tests in CI

- Tests run automatically on PR
- Results available in GitHub Actions
- Failures block merging

## 🚨 Troubleshooting

### Tests Failing Locally

1. **Install Playwright browsers** (first time only):

   ```bash
   npm run playwright:install
   ```

2. **Ensure test infrastructure is running**:

   ```bash
   # Check if services are running
   docker ps | grep -E "postgres-test|minio-test"

   # If not running, start them:
   docker-compose -f docker-compose.test.yml up -d
   ```

3. **Verify API is accessible**:

   ```bash
   curl http://localhost:3000/health
   ```

4. **Check for port conflicts**:

   ```bash
   # Check ports 5173 (web), 3000 (API), 5434 (PostgreSQL), 9012 (MinIO)
   lsof -i :5173
   lsof -i :3000
   lsof -i :5434
   lsof -i :9012
   ```

5. **Clear browser cache and test data**:

   ```bash
   # Stop and clean test infrastructure
   docker-compose -f docker-compose.test.yml down -v

   # Restart
   docker-compose -f docker-compose.test.yml up -d
   ```

6. **Look at screenshots/videos in test-results/** for visual debugging

### Flaky Tests

1. Add proper wait conditions
2. Increase timeouts if needed
3. Check for race conditions
4. Use `test.fail()` to mark known issues

## 🧹 Data Cleanup Strategy

### Overview

Tests create data during execution (projects, episodes, sequences, shots, assets, etc.). To prevent data accumulation that causes performance degradation and test failures, we implement automatic cleanup using the `CleanupHelper` class.

### CleanupHelper

The `CleanupHelper` provides methods to clean up test data:

- `deleteProjectByCode(code: string)` - Delete a specific project
- `deleteEntityByCode(entityType, code: string)` - Delete any entity by type and code
- `deleteMultipleProjects(codes: string[])` - Delete multiple projects in batch
- `cleanupTestProjects(pattern?: string)` - Clean up projects matching a pattern (default: 'PLW*PRJ*')
- `cleanupAllTestData()` - Full cleanup in reverse dependency order

### Usage Pattern

```typescript
test.afterEach(async ({ cleanup, page }) => {
  if (page.isClosed()) {
    return;
  }

  const projectData = (page as any).__testProjectData;
  if (projectData?.code) {
    try {
      await cleanup.deleteProjectByCode(projectData.code);
    } catch (error) {
      console.warn('Failed to cleanup project:', projectData.code, error);
    }
  }
});
```

### Cleanup Order

Always clean up in **reverse dependency order** to avoid foreign key constraint errors:

1. Shots (depend on sequences)
2. Sequences (depend on episodes)
3. Episodes (depend on projects)
4. Projects (top level)
5. Assets (depend on projects)

### Best Practices

- **Store codes in beforeEach**: Save entity codes in `(page as any).__testEntityCode` for later cleanup
- **Use try-catch**: Cleanup failures shouldn't fail tests - wrap in try-catch
- **Check page state**: Always verify `page.isClosed()` before cleanup operations
- **Pattern-based cleanup**: Use consistent prefixes (PLW*PRJ*, PLW*EP*, etc.) for test data
- **Batch operations**: Use `deleteMultipleProjects()` for multiple items to reduce API calls
- **Conditional cleanup**: Consider cleaning only if test passed (using `testInfo.status`) for easier debugging

### Troubleshooting Cleanup

If cleanup is failing:

1. **Check logs**: CleanupHelper logs all operations with `[Cleanup]` prefix
2. **Verify selectors**: Ensure the entity exists in the table before attempting deletion
3. **Check permissions**: Ensure test user has DELETE permissions
4. **Manual cleanup**: Use `cleanupTestProjects('PLW_PRJ_')` to clean up all test projects
5. **Database reset**: As last resort, reset test database: `docker-compose -f docker-compose.test.yml down -v`

### Timeout Errors

1. Increase timeout in playwright.config.ts
2. Check network speed
3. Optimize test data creation
4. Use `test.slow()` for slow tests

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 📞 Support

For issues with tests:

1. Check this README
2. Review test-helpers.ts for available utilities
3. Look at existing test examples
4. Check Playwright documentation
5. Ask the team

---

Happy Testing! 🎭
