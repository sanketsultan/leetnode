#!/bin/bash
# Start redis with the (broken) config before the user's shell opens.
service redis-server start 2>/dev/null \
  || redis-server /etc/redis/redis.conf --daemonize yes 2>/dev/null \
  || true
sleep 0.3
exec "$@"
