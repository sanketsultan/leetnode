# /test — Run all tests

Runs the full test suite for LeetNode: backend unit/integration tests (Jest) and frontend E2E tests (Playwright). Always run this after any change to verify nothing is broken.

## Usage

```
/test              # run all tests
/test backend      # run only Jest tests
/test e2e          # run only Playwright E2E tests
/test e2e --ui     # open Playwright interactive UI
```

## Steps

### 1. Backend tests (Jest)

```bash
cd /Users/sanket/Desktop/leetnode/backend
npm test
```

Expected: all tests pass. If failures, read the error output carefully.

Common failures:
- Path issues in test files → check `PROBLEMS_DIR` points to `../../../problems`
- Missing problem JSON → run `/add-problem` first
- Docker files missing → check `docker/problems/<slug>/` has Dockerfile, setup.sh, verify.sh

### 2. Frontend E2E tests (Playwright)

**Prerequisites**: both backend and frontend dev servers must be running.

Check if running:
```bash
lsof -ti :3001 && echo "backend OK" || echo "backend NOT running"
lsof -ti :3000 && echo "frontend OK" || echo "frontend NOT running"
```

If not running, start them:
```bash
# Terminal 1
cd /Users/sanket/Desktop/leetnode/backend && npm run dev

# Terminal 2
cd /Users/sanket/Desktop/leetnode/frontend && npm run dev
```

Run E2E tests:
```bash
cd /Users/sanket/Desktop/leetnode/frontend
npx playwright test
```

### 3. Interpreting results

**All green**: ship it.

**Backend failures**: fix the underlying code, re-run `npm test`.

**E2E failures**:
- `net::ERR_CONNECTION_REFUSED` → services not running
- Element not found → UI changed, update selectors in `frontend/tests/e2e.spec.ts`
- Terminal not connecting → check WebSocket on port 3002, check Docker is running

## Adding tests for new features

When adding a new feature:
1. Add backend unit test in `backend/src/__tests__/api.test.ts` (or a new file)
2. Add E2E test case in `frontend/tests/e2e.spec.ts`
3. Run `/test` to confirm new tests pass
4. Never mark a feature complete until tests are green
