Show recent logs from LeetNode services to debug issues.

Run based on what the user wants to see (default: backend logs):

**Backend logs** (most common):
```bash
# Find the backend process
lsof -i :3001 | grep LISTEN

# If running with tsx watch, show the terminal output
# If running as systemd service:
journalctl -u leetnode-backend -f --lines=50
```

**Active Docker containers + their logs:**
```bash
docker ps --filter "name=leetnode-session-"

# Logs from a specific container (ask user for session ID if needed):
docker logs leetnode-session-<id> --tail=20
```

**Container inspect** (for debugging a specific session):
```bash
docker inspect leetnode-session-<id> | python3 -m json.tool
```

**Recent Docker events:**
```bash
docker events --since 10m --filter "name=leetnode"
```

**Port bindings:**
```bash
lsof -i :3001 -i :3002 -i :3000
```

If the user describes a specific error, focus on the relevant log source and filter for the error pattern. Always show timestamps.
