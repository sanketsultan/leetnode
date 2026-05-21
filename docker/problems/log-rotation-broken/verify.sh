#!/bin/bash
# verify.sh — log-rotation-broken

CONFIG=/etc/logrotate.d/app

# Step 1: extract the first path from the config and check it exactly
LOGPATH=$(grep -v '^\s*[#}]' "$CONFIG" 2>/dev/null | grep -v '^\s*$' | head -1 | awk '{print $1}')

if [ "$LOGPATH" != "/var/log/app/service.log" ]; then
  echo "{\"success\": false, \"message\": \"The logrotate config points to '${LOGPATH:-nothing}' but the log file is /var/log/app/service.log. Fix the path.\"}"
  exit 1
fi

# Step 2: force rotation and check it worked
logrotate -f "$CONFIG" 2>/dev/null

if ls /var/log/app/service.log.1 2>/dev/null | grep -q .; then
  echo '{"success": true, "message": "Logrotate is working. service.log was rotated to service.log.1."}'
elif ls /var/log/app/service.log-*.gz 2>/dev/null | grep -q .; then
  echo '{"success": true, "message": "Logrotate is working. service.log was rotated and compressed."}'
else
  echo '{"success": false, "message": "Config path looks right but rotation still failed. Run: logrotate -d /etc/logrotate.d/app to debug."}'
  exit 1
fi
