Test a problem's verify script end-to-end — both the buggy and fixed paths.

If a slug is provided as argument, test only that problem. Otherwise test all problems found in `docker/problems/`.

For each problem:

**1. Confirm the image exists**
```
docker images leetnode-problem-<slug>:latest
```
If missing, build it first.

**2. Test the BUGGY path** (should FAIL fast):
```
docker run --rm -u root leetnode-problem-<slug>:latest bash /root/verify.sh
```
- Must exit non-zero
- Must return valid JSON with `"success": false`
- Should complete in under 5 seconds (static check, no script execution)
- Print: `BUGGY ✓` if it fails correctly, `BUGGY ✗` if it unexpectedly passes

**3. Determine the fix** by reading `docker/problems/<slug>/setup.sh` and `docker/problems/<slug>/verify.sh` to understand what the correct fix is.

**4. Test the FIXED path** (should PASS):
Apply the fix inside the container and run verify:
```
docker run --rm -u root leetnode-problem-<slug>:latest bash -c "<apply fix command> && bash /root/verify.sh"
```
- Must exit 0
- Must return valid JSON with `"success": true`
- Print: `FIXED ✓` if it passes, `FIXED ✗` if it fails

**5. Report timing** for both paths.

**Summary table:**
```
Problem          Buggy   Fixed   Buggy time   Fixed time
cuda-oom         ✓       ✓       1.2s         12.4s
```

If either path is wrong, show the full JSON output and diagnose the issue.
