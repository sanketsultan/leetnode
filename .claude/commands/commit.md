Create a clean git commit for the current LeetNode changes.

1. Run `git status` and `git diff --stat` to see what changed
2. Group changes by component:
   - `backend/` — API, services, routes
   - `frontend/` — UI components, pages
   - `docker/` — container images, problem scripts
   - `problems/` — problem metadata JSON
   - `.claude/` — project commands/config

3. Stage relevant files (exclude `.env`, `node_modules`, `dist/`, `.next/`):
   ```
   git add <specific files>
   ```

4. Write a concise commit message following this format:
   - First line: `<type>(<scope>): <what changed>` (max 72 chars)
   - Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`
   - Examples:
     - `feat(problem): add k8s-crashloop problem`
     - `fix(verify): instant static check for cuda-oom`
     - `style(ui): clean minimal redesign`

5. Commit:
   ```
   git commit -m "..."
   ```

6. Show `git log --oneline -5` after committing.

Do NOT:
- Commit `.env` files
- Commit `node_modules/` or build artifacts
- Use `git add .` or `git add -A` blindly
- Push unless the user explicitly asks
