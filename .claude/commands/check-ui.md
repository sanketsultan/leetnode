# /check-ui — Live browser inspection & diagnosis

Use the Claude Preview MCP tools to actively inspect the running UI, catch errors, and diagnose layout or behaviour problems — the same way the terminal "Starting container" bug was found.

## When to use this skill

Run `/check-ui` after any UI change, or whenever the user reports something looks or behaves wrong. Don't guess from code alone — look at what the browser actually renders.

## Steps to run

### 1. Start the preview server

```
preview_start("frontend")   ← reads .claude/launch.json, reuses if already running
```

Save the returned `serverId` — every tool call below needs it.

### 2. Take a screenshot (visual sanity check)

```
preview_screenshot(serverId)
```

Look for: layout broken, text overflowing, wrong colours, elements hidden/overlapping, loading states that never clear.

### 3. Check console errors (most important for logic bugs)

```
preview_console_logs(serverId, level="error")
```

React errors, uncaught exceptions, failed fetches, and hook warnings all appear here.  
**Common patterns:**
- `Warning: Each child in a list should have a unique "key"` → missing key prop
- `Warning: Cannot update a component ... while rendering a different component` → setState during render
- `Uncaught TypeError` → null ref, missing data, wrong type
- `Warning: An update to X inside a test was not wrapped in act(...)` → async effect not cleaned up
- WebSocket errors (`WebSocket is closed`, `connection refused`) → backend not running or wrong port

### 4. Check network requests (API / WebSocket failures)

```
preview_network(serverId, filter="failed")
```

Catches: 404 on API routes, 503 when backend is down, CORS errors, wrong proxy config.  
To inspect a response body:
```
preview_network(serverId, requestId="<id from listing>")
```

### 5. Inspect specific elements (styles & layout)

```
preview_inspect(serverId, selector=".xterm-container", styles=["display","width","height","background"])
preview_inspect(serverId, selector="a.problem-row")
preview_inspect(serverId, selector="button")
```

Use this to verify: element actually exists in DOM, computed styles match intent, bounding box is non-zero (element is not hidden with zero size).

### 6. Snapshot accessibility tree (text content & structure)

```
preview_snapshot(serverId)
```

Returns exact text on screen and element roles. Use to verify: text content is correct, buttons have labels, loading messages cleared, expected sections are present.

## React-specific things to look for

| Symptom | What to check |
|---------|---------------|
| Message never clears after load | `console_logs` for double-invocation warnings. No cleanup `return () => {}` in useEffect → runs twice in Strict Mode |
| Data listener stacking (double input, double events) | `console_logs` for "Warning: Can't perform a React state update on an unmounted component" — listeners not disposed in effect cleanup |
| State doesn't update after async | `console_logs` for stale closure warnings. Check if `useState` setter is called after component unmounted |
| Wrong element rendered | `snapshot` — compare actual tree vs expected |
| Style applied in code but not visible | `inspect` — check computed styles, not just className |
| API call fires twice | `network` — two identical requests → useEffect dep array has object/array that changes every render |

## Example: how the "Starting terminal" bug was diagnosed

1. `screenshot` → terminal panel showed "Starting container…" even though status bar said "Connected"
2. `console_logs(level="error")` → no React errors, but Strict Mode was active (Next.js dev always enables it)
3. Recognised pattern: Strict Mode double-invokes effects → an effect without a cleanup `return` runs twice
4. `inspect(".xterm-container")` → element exists, non-zero size → terminal was mounted fine
5. Conclusion: `wsUrl` useEffect had no cleanup → `connectWebSocket` called twice → second call ran `term.reset()` after first WS connected, wiping the shell prompt

## Fixing what you find

After diagnosis:
1. Edit the source file directly — never fix via `preview_eval` (changes are lost on reload)
2. Re-run `preview_screenshot` + `preview_console_logs` after the fix to confirm
3. Run `cd frontend && npx playwright test` to make sure E2E tests still pass
4. Add a Playwright test case for the specific bug so it can't regress

## Navigation during inspection

```
preview_eval(serverId, "window.location.href = '/problems/cuda-oom'")   // navigate to a route
preview_eval(serverId, "window.location.reload()")                       // force reload
preview_eval(serverId, "document.querySelectorAll('.problem-row').length") // quick DOM count
```
