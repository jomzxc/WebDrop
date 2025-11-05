# Testing Documentation

This document describes the testing strategy and how to run tests for the WebDrop application.

## Testing Stack

- **Unit & Component Tests**: [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/react)
- **E2E Tests**: [Playwright](https://playwright.dev/)
- **Coverage**: Vitest Coverage (v8)

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── lib/                 # Library/utility tests
│   │   ├── utils.test.ts
│   │   └── webrtc/
│   │       └── file-transfer.test.ts
│   └── components/          # Component tests (to be added)
├── auth.spec.ts             # E2E: Authentication tests
├── profile.spec.ts          # E2E: Profile management tests
├── room.spec.ts             # E2E: Room management tests
├── transfer.spec.ts         # E2E: P2P file transfer tests
├── ui.spec.ts               # E2E: UI/UX tests
├── global.setup.ts          # Playwright global setup
├── setup.ts                 # Vitest test setup
├── fixtures/                # Test fixtures
└── utils/                   # Test utilities
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### E2E Tests

**Prerequisites:**
- Build the application first: `pnpm build`
- Set up environment variables in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `TESTMAIL_API_KEY` (for email-based tests)
  - `TESTMAIL_NAMESPACE` (for email-based tests)

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# View last test report
pnpm test:e2e:report
```

### Run All Tests

```bash
# Run both unit and E2E tests
pnpm test:all
```

## Test Categories

### Unit Tests

#### Utility Tests (`tests/unit/lib/utils.test.ts`)
- Tests the `cn()` utility for merging CSS classes
- Validates conditional class handling
- Tests Tailwind CSS class merging

#### File Transfer Tests (`tests/unit/lib/webrtc/file-transfer.test.ts`)
- Tests file chunking and sending logic
- Tests metadata handling
- Tests chunk accumulation and progress tracking
- Tests blob assembly from chunks
- Tests transfer cancellation and cleanup

### E2E Tests

#### Authentication Tests (`tests/auth.spec.ts`)
- Sign-out flow
- Sign-in with email
- Session persistence

#### Profile Tests (`tests/profile.spec.ts`)
- Username updates
- Avatar uploads
- Profile persistence

#### Room Management Tests (`tests/room.spec.ts`)
- Room creation
- Room joining with validation
- Room ID format validation
- Leaving rooms
- Room persistence on page refresh
- User presence display

#### File Transfer Tests (`tests/transfer.spec.ts`)
- P2P file sending and receiving
- Progress tracking
- Multi-user connection

#### UI Tests (`tests/ui.spec.ts`)
- Dark mode toggle
- Theme persistence
- Page navigation
- Responsive design
- User dropdown menu
- Loading states

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/myModule'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should perform action', async ({ page }) => {
  await page.goto('/path')
  await page.click('button')
  await expect(page.locator('text=Success')).toBeVisible()
})
```

## CI/CD Integration

Tests are automatically run in GitHub Actions on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### CI Pipeline

1. **Lint** - Code style checks
2. **Unit Tests** - Fast unit and component tests
   - Generates coverage report
3. **E2E Tests** - Full integration tests
   - Requires Supabase secrets
   - Generates Playwright report

## Coverage Goals

- **Overall**: Aim for >80% code coverage
- **Critical Paths**: 100% coverage for:
  - File transfer logic
  - Authentication flows
  - Data validation

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Speed**: Keep unit tests fast (<1s each)
3. **Clarity**: Use descriptive test names
4. **Cleanup**: Always clean up after tests
5. **Mocking**: Mock external dependencies in unit tests
6. **Fixtures**: Use test fixtures for consistent data
7. **Assertions**: Make specific, meaningful assertions

## Debugging Tests

### Unit Tests

```bash
# Run specific test file
pnpm test tests/unit/lib/utils.test.ts

# Run tests matching pattern
pnpm test -t "should merge"

# Debug with Chrome DevTools
pnpm test --inspect-brk
```

### E2E Tests

```bash
# Run in headed mode
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/auth.spec.ts

# Debug specific test
pnpm test:e2e --debug
```

## Common Issues

### Unit Tests

**Issue**: `chunk.arrayBuffer is not a function`
**Solution**: Ensure `tests/setup.ts` includes the Blob polyfill

**Issue**: Module import errors
**Solution**: Check path aliases in `vitest.config.ts`

### E2E Tests

**Issue**: Tests timing out
**Solution**: Increase timeout in test or check network connectivity

**Issue**: Authentication failures
**Solution**: Verify `TESTMAIL_API_KEY` and `TESTMAIL_NAMESPACE` environment variables

## Future Testing Plans

- [ ] Add component tests for all React components
- [ ] Add integration tests for API routes
- [ ] Add visual regression tests
- [ ] Add performance tests
- [ ] Add accessibility tests (a11y)
- [ ] Add load/stress tests for file transfers
- [ ] Implement test data factories
- [ ] Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
