#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building LeetNode Docker images..."

# Build base image
echo ""
echo ">>> Building base image..."
docker build -t leetnode-base:latest "$ROOT_DIR/docker/base"

# Build problem images
echo ""
echo ">>> Building cuda-oom problem image..."
docker build -t leetnode-problem-cuda-oom:latest "$ROOT_DIR/docker/problems/cuda-oom"

echo ""
echo "All images built successfully!"
echo ""
docker images | grep leetnode
