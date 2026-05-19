Check the health and status of all LeetNode services.

Run all of these checks and report results:

**1. Backend API**
```
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/problems
curl -s http://localhost:3001/api/sessions
```
Report: running/down, number of problems loaded, active sessions count.

**2. Frontend**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Report: running/down.

**3. WebSocket server**
Check if port 3002 is listening:
```
lsof -i :3002 | grep LISTEN
```
Report: running/down.

**4. Docker images**
```
docker images | grep leetnode
```
List all leetnode images with size and age.

**5. Running containers**
```
docker ps --filter "name=leetnode-session-" --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}"
```
Report active session containers.

**6. Port summary**
```
lsof -i :3001 -i :3002 -i :3000 | grep LISTEN
```

Print a clean summary:
```
Service     Status    Detail
────────────────────────────────────
Backend     ✓ up      3 problems, 1 active session
Frontend    ✓ up      http://localhost:3000
WebSocket   ✓ up      port 3002
Docker      ✓ ready   2 images (leetnode-base, leetnode-problem-cuda-oom)
```

If backend is down, suggest: `cd backend && npm run dev`
If frontend is down, suggest: `cd frontend && npm run dev`
