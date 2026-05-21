Scaffold a complete new LeetNode problem from scratch.

Ask the user for:
1. **slug** - kebab-case identifier (e.g. `k8s-crashloop`)
2. **title** - human readable title
3. **difficulty** - easy / medium / hard
4. **category** - e.g. "Kubernetes", "CUDA / GPU", "Networking", "System"
5. **tags** - comma-separated list
6. **scenario** - one paragraph describing the broken environment
7. **the bug** - what is actually broken and how to fix it
8. **time limit** - in minutes (default 30)

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
- Fast static check first (AST, grep, or file analysis - no script execution)
- If static check fails: instant JSON failure with a hint (no spoilers - do not give the exact answer)
- If static check passes: run the actual command with `timeout 90` to confirm it works
- Output exactly one JSON line: `{"success": bool, "message": "..."}`
- Exit 0 on success, 1 on failure

**`docker/problems/<slug>/Dockerfile`**
- `FROM leetnode-base:latest`
- Install only what the problem needs (keep it minimal - each apt package costs RAM)
- `COPY setup.sh /tmp/setup.sh` then `RUN bash /tmp/setup.sh && rm /tmp/setup.sh`
- `COPY verify.sh /root/verify.sh` + `RUN chmod +x /root/verify.sh`
- Add LABELs for `com.leetnode.problem` and `com.leetnode.title`
- `WORKDIR /home/user` then `USER user` then `CMD ["sleep", "infinity"]`
- No heredocs in Dockerfile - write scripts as separate files

**Resource constraints (t3.medium: 2 vCPU / 4 GB RAM)**

Each problem container runs with hard limits set in `backend/src/services/dockerService.ts`:
- Memory: 256 MB (hard cap, OOM-killed if exceeded)
- CPU: 0.5 vCPU max
- PIDs: 64 max (prevents fork bombs)
- Network: none (completely isolated)

Design problems to stay well under these limits:
- Avoid spawning many processes simultaneously
- Do not install heavy runtimes (Java, Rust toolchain) unless essential
- Simulate OOM conditions with Python/dd/fallocate, not by actually filling RAM
- Problems that only use bash/nginx/logrotate use under 20 MB at rest

Service budget breakdown (leave headroom for containers):
- nginx: 32 MB / 0.1 CPU
- backend: 192 MB / 0.4 CPU
- frontend: 256 MB / 0.4 CPU
- 10 problem containers worst case: 10 x 256 MB = 2.56 GB
- Total: ~3.04 GB of 4 GB used at full load

Session config (set via docker-compose env):
- SESSION_TTL_MS: 1200000 (20 minutes per session)
- MAX_SESSIONS: 10 (concurrent problem containers)

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
    "More specific - what type of thing to look for",
    "Very specific - almost the answer but still requires the user to act"
  ]
}
```

After creating all files:
1. Run `docker build -t leetnode-base:latest docker/base/` if the base image does not exist
2. Run `docker build -t leetnode-problem-<slug>:latest docker/problems/<slug>/`
3. Test the buggy path: `docker run --rm -u root leetnode-problem-<slug>:latest bash /root/verify.sh`
4. Test the fixed path by applying the fix in-container and running verify again
5. Check container memory at rest: `docker stats --no-stream leetnode-problem-<slug>` (should be under 64 MB idle)
6. Report pass/fail for both tests + idle memory usage

Do not proceed past file creation if the user has not confirmed the scenario and bug details.
