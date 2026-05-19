Build LeetNode Docker images.

Check which images need building:
1. Run `docker images --format "{{.Repository}}:{{.Tag}}" | grep leetnode` to see what exists
2. Find all problem slugs by listing `docker/problems/` directories

Then build in order:
1. **Base image** — always build first:
   ```
   docker build -t leetnode-base:latest docker/base/
   ```

2. **Problem images** — build each one found in `docker/problems/`:
   ```
   docker build -t leetnode-problem-<slug>:latest docker/problems/<slug>/
   ```
   Use `--no-cache` only if the user explicitly asked for a clean build.

3. After all builds complete, run:
   ```
   docker images | grep leetnode
   ```
   and show the resulting image list with sizes.

If any build fails, show the full error output and stop. Do not continue building other images if the base image fails.

If the user passes a specific slug argument (e.g. `/build cuda-oom`), only build that problem image (and the base if it doesn't exist yet).
