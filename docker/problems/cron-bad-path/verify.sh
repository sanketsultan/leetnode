#!/bin/bash
# verify.sh — cron-bad-path
# Outputs exactly one JSON line. Exit 0 = success, 1 = failure.

SCRIPT=/usr/local/bin/rotate-logs.sh

# ── Step 1: Static check — does crontab use the full path? ──────────────────
CRON_ENTRY=$(crontab -l 2>/dev/null | grep -v '^#' | grep -v '^MAILTO' | grep -v '^PATH' | grep 'rotate' | head -1)

if [ -z "$CRON_ENTRY" ]; then
  echo '{"success": false, "message": "No cron entry found for rotate-logs.sh. Run: crontab -e and add the job back."}'
  exit 1
fi

# Check whether the entry uses the full path or a relative command
if echo "$CRON_ENTRY" | grep -qE '(^|[^/])(rotate-logs\.sh)([[:space:]]|$)' && \
   ! echo "$CRON_ENTRY" | grep -qE '/rotate-logs\.sh'; then
  echo "{\"success\": false, \"message\": \"The crontab still uses a bare command name (rotate-logs.sh) without a full path. Cron's PATH is /usr/bin:/bin, which doesn't include /usr/local/bin. Change it to: /usr/local/bin/rotate-logs.sh\"}"
  exit 1
fi

# Also accept if user set PATH at top of crontab and uses bare name
CRON_PATH=$(crontab -l 2>/dev/null | grep '^PATH=' | head -1)
if [ -n "$CRON_PATH" ]; then
  # PATH is set in crontab — verify it includes /usr/local/bin
  if echo "$CRON_PATH" | grep -q '/usr/local/bin'; then
    :  # PATH approach is valid
  else
    echo "{\"success\": false, \"message\": \"A PATH is set in crontab but it doesn't include /usr/local/bin where rotate-logs.sh lives. Add /usr/local/bin to the PATH line.\"}"
    exit 1
  fi
fi

# ── Step 2: Functional test — run the script and check it succeeds ───────────
# Make sure there's a log file to rotate
mkdir -p /var/log/app
if [ ! -s /var/log/app/app.log ]; then
  echo "$(date) INFO test entry for verify" > /var/log/app/app.log
fi

BEFORE_ARCHIVES=$(ls /var/log/app/archive/ 2>/dev/null | wc -l)
OUTPUT=$(bash "$SCRIPT" 2>&1)
EXIT_CODE=$?
AFTER_ARCHIVES=$(ls /var/log/app/archive/ 2>/dev/null | wc -l)

if [ $EXIT_CODE -ne 0 ]; then
  echo "{\"success\": false, \"message\": \"rotate-logs.sh returned exit code ${EXIT_CODE}. Output: ${OUTPUT}\"}"
  exit 1
fi

if [ "$AFTER_ARCHIVES" -le "$BEFORE_ARCHIVES" ]; then
  echo '{"success": false, "message": "rotate-logs.sh ran but did not create an archive file. Check the script logic."}'
  exit 1
fi

echo "{\"success\": true, \"message\": \"Crontab now uses the full path. rotate-logs.sh ran successfully and archived the log.\"}"
exit 0
