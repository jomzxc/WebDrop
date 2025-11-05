# Testing Guide for WebDrop

This document describes the testing strategy and how to run tests for the WebDrop application.

## Test Structure

WebDrop uses a multi-layered testing approach:

### 1. Unit Tests (Vitest)
- **Location**: `lib/**/*.test.ts`, `components/**/*.test.tsx`
- **Purpose**: Test individual functions, classes, and React components in isolation
- **Coverage**: Utility functions, WebRTC managers, React components

### 2. Integration Tests (Vitest + React Testing Library)
- **Location**: `components/**/*.test.tsx`
- **Purpose**: Test component interactions and behavior
- **Coverage**: Component state management, user interactions, error boundaries

### 3. End-to-End Tests (Playwright)
- **Location**: `tests/**/*.spec.ts`
- **Purpose**: Test complete user workflows in a real browser
- **Coverage**: Authentication, profile management, file transfers, error handling

## Running Tests

### Run All Unit Tests
```bash
pnpm test
# or watch mode
pnpm test --watch
```

### Run Unit Tests Once (CI mode)
```bash
pnpm test:unit
```

### Run Tests with UI
```bash
pnpm test:ui
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```
Coverage reports are generated in the `coverage/` directory.

### Run E2E Tests
```bash
# First, build the application
pnpm build

# Then run E2E tests
pnpm test:e2e

# Or run with UI
pnpm test:e2e:ui

# View test report
pnpm test:e2e:report
```

### Run All Tests
```bash
pnpm test:all
```

## Test Configuration

### Vitest Configuration
- **File**: `vitest.config.ts`
- **Environment**: jsdom (for React component tests)
- **Setup**: `tests/setup.ts` (global test setup, mocks)
- **Coverage Provider**: v8

### Playwright Configuration
- **File**: `playwright.config.ts`
- **Browser**: Chromium (can be extended to Firefox and WebKit)
- **Projects**: 
  - `setup`: Creates authenticated test users
  - `chromium-user1`: Tests requiring single authenticated user
  - `chromium-transfer`: P2P transfer tests with two users

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/my-module'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Component Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
  
  it('should handle click', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'

test('user can sign in', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/room')
})
```

## Test Coverage

Current test coverage includes:

### Unit Tests
- ✅ `lib/utils.ts` - Utility functions (cn)
- ✅ `lib/webrtc/file-transfer.ts` - File transfer manager
- ✅ `lib/webrtc/peer-connection.ts` - WebRTC peer connections

### Integration Tests
- ✅ `components/error-boundary.tsx` - Error boundary component

### E2E Tests
- ✅ Authentication flows (sign in, sign out)
- ✅ Profile management (update username, upload avatar)
- ✅ File transfer (P2P transfer between two users)
- ✅ Error handling (invalid inputs, network issues, edge cases)

## Environment Variables for E2E Tests

E2E tests require these environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]

# Email testing (for sign-up flow)
TESTMAIL_API_KEY=[api-key]
TESTMAIL_NAMESPACE=[namespace]
```

Without these variables, the global setup will be skipped and tests requiring authentication will fail.

## CI/CD Integration

Tests are automatically run in GitHub Actions on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI pipeline runs:
1. Linting
2. Unit tests (with coverage)
3. E2E tests (if environment variables are configured)

## Debugging Tests

### Debug Unit Tests
```bash
# Run tests in watch mode with UI
pnpm test:ui
```

### Debug E2E Tests
```bash
# Run with headed browser
pnpm test:e2e -- --headed

# Run with debug mode
pnpm test:e2e -- --debug

# Run specific test file
pnpm test:e2e tests/auth.spec.ts
```

### View E2E Test Traces
If a test fails in CI, download the `playwright-report` artifact and view it:
```bash
pnpm test:e2e:report
```

## Mocking

### Test Setup Mocks
The `tests/setup.ts` file provides global mocks for:
- `window.matchMedia` (for theme tests)
- `RTCPeerConnection` (for WebRTC tests)
- `File` API (for file upload tests)

### Custom Mocks
Use Vitest's `vi` utility for mocking:
```typescript
import { vi } from 'vitest'

const mockFn = vi.fn()
vi.spyOn(object, 'method').mockReturnValue('value')
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Use Descriptive Test Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Isolate Tests**: Each test should be independent and not rely on others
5. **Mock External Dependencies**: Use mocks for API calls, timers, and external services
6. **Test Edge Cases**: Include tests for error conditions and boundary cases
7. **Keep Tests Fast**: Unit tests should run in milliseconds, not seconds

## Common Issues

### Issue: Tests fail with "RTCPeerConnection is not defined"
**Solution**: Ensure `tests/setup.ts` is properly configured in `vitest.config.ts`

### Issue: E2E tests fail to authenticate
**Solution**: Verify `TESTMAIL_API_KEY` and `TESTMAIL_NAMESPACE` are set correctly

### Issue: File upload tests fail
**Solution**: Ensure test fixtures exist in `tests/fixtures/`

### Issue: Coverage reports are incomplete
**Solution**: Check `vitest.config.ts` coverage exclusions and ensure all source files are imported

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
