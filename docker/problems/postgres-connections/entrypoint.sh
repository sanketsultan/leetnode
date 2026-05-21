#!/bin/bash
# Start PostgreSQL before the user's shell opens.
service postgresql start 2>/dev/null || true
sleep 1
exec "$@"
