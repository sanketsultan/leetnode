Scaffold a complete new LeetNode problem from scratch.

Ask the user for:
1. **slug** — kebab-case identifier (e.g. `k8s-crashloop`)
2. **title** — human readable title
3. **difficulty** — easy / medium / hard
4. **category** — e.g. "Kubernetes", "CUDA / GPU", "Networking", "System"
5. **tags** — comma-separated list
6. **scenario** — one paragraph describing the broken environment
7. **the bug** — what is actually broken and how to fix it
8. **time limit** — in minutes (default 30)

Then create ALL of the following files:

**`docker/problems/<slug>/setup.sh`**
- Creates the broken environment inside the container
- Writes the broken script/config to `/home/user/`
- Writes `README.txt` with a clear problem description and hint to run the main command
- Appends a banner to `/home/user/.bashrc`
- All files owned by `user:user`
- The bug must be realistic and non-obvious at first glance
- The OOM/failure must be simulated without requiring real GPU/k8s

**`docker/problems/<slug>/verify.sh`**
- Fast static check first (AST, grep, or file analysis — no script execution)
- If static check fails: instant JSON failure with a hint (no spoilers — don't give the exact answer)
- If static check passes: run the actual command with `timeout 90` to confirm it works
- Output exactly one JSON line: `{"success": bool, "message": "..."}`
- Exit 0 on success, 1 on failure

**`docker/problems/<slug>/Dockerfile`**
- `FROM leetnode-base:latest`
- Install only what the problem needs (keep it minimal)
- `COPY setup.sh /tmp/setup.sh` → `RUN bash /tmp/setup.sh && rm /tmp/setup.sh`
- `COPY verify.sh /root/verify.sh` + `RUN chmod +x /root/verify.sh`
- Add LABELs for `com.leetnode.problem` and `com.leetnode.title`
- `WORKDIR /home/user` → `USER user` → `CMD ["sleep", "infinity"]`
- No heredocs in Dockerfile — write scripts as separate files

**`problems/<slug>.json`**
```json
{
  "slug": "...",
  "title": "...",
  "difficulty": "...",
  "category": "...",
  "tags": [...],
  "dockerImage": "leetnode-problem-<slug>:latest",
  "timeLimit": <seconds>,
  "description": "## The Situation\n\n...\n\n## Your Task\n\n1. ...\n2. ...\n\n## Useful Commands\n\n```bash\n...\n```",
  "hints": [
    "General direction without giving the answer",
    "More specific — what type of thing to look for",
    "Very specific — almost the answer but still requires the user to act"
  ]
}
```

After creating all files:
1. Run `docker build -t leetnode-base:latest docker/base/` if the base image doesn't exist
2. Run `docker build -t leetnode-problem-<slug>:latest docker/problems/<slug>/`
3. Test the buggy path: `docker run --rm -u root leetnode-problem-<slug>:latest bash /root/verify.sh`
4. Test the fixed path by applying the fix in-container and running verify again
5. Report pass/fail for both tests

Do not proceed past file creation if the user hasn't confirmed the scenario and bug details.
