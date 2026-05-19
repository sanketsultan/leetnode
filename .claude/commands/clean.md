Clean up all orphaned LeetNode Docker containers and optionally images.

**Step 1 — Show what exists:**
```
docker ps -a --filter "name=leetnode-session-" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
```

**Step 2 — Stop and remove all leetnode session containers:**
```
docker ps -aq --filter "name=leetnode-session-" | xargs -r docker rm -f
```
Report how many were removed.

**Step 3 — If the user passed `--images` or asked to clean images too:**
List and confirm before removing:
```
docker images | grep "leetnode-problem"
```
Ask for confirmation, then:
```
docker images -q --filter "reference=leetnode-problem-*" | xargs -r docker rmi
```

**Step 4 — Show final state:**
```
docker ps -a --filter "name=leetnode" 
docker images | grep leetnode
```

Do NOT remove:
- `leetnode-base:latest`
- `leetnode-problem-*:latest` images (unless `--images` flag given)
- Any non-leetnode containers

This is safe to run at any time during development. The backend's session manager will handle any in-progress sessions gracefully.
