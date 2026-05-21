#!/bin/bash
# Start cron daemon so the scheduled job can (attempt to) fire.
service cron start 2>/dev/null || cron 2>/dev/null || true
exec "$@"
