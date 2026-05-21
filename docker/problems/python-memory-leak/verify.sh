#!/bin/bash
# verify.sh — python-memory-leak
# Outputs exactly one JSON line. Exit 0 = success, 1 = failure.

SCRIPT=/home/user/processor.py

# ── Step 1: Static check — did they add any bounding mechanism? ───────────────
if ! grep -qE '(lru_cache|maxsize|\.clear\(\)|del _result_cache|_result_cache\s*=\s*\{\}|if len\(_result_cache\))' "$SCRIPT" 2>/dev/null; then
  echo '{"success": false, "message": "No cache bounding mechanism found. Add functools.lru_cache(maxsize=...) or manually evict old entries."}'
  exit 1
fi

# ── Step 2: Run and check exit code ───────────────────────────────────────────
OUTPUT=$(timeout 60 python3 "$SCRIPT" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
  echo '{"success": false, "message": "Script timed out after 60 seconds. Make sure it still runs correctly."}'
  exit 1
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo '{"success": true, "message": "Cache stays bounded across batches. Memory leak fixed!"}'
else
  # Extract the cache count from output if present
  TOTAL=$(echo "$OUTPUT" | grep -oP 'Total cache entries: \K\d+' | head -1)
  if [ -n "$TOTAL" ]; then
    echo "{\"success\": false, \"message\": \"Cache still has ${TOTAL} entries after 3 batches. It should stay under 600 (one batch worth or less).\"}"
  else
    echo '{"success": false, "message": "Script exited with an error. Check that processor.py still runs correctly."}'
  fi
  exit 1
fi
exit 0
