# Update Docs

Scan the last commit and update project documentation to reflect what changed.

## Steps

### 1. Understand what changed

Run `git diff HEAD~1..HEAD --stat` to see which files changed.
Run `git log -1 --format="%s%n%b"` to read the commit message.
Run `git diff HEAD~1..HEAD` on the most relevant changed files (skip lock files, images, generated files).

### 2. Update CLAUDE.md

Read the current `CLAUDE.md`. Update it only if the commit introduced:
- A new game under `packages/engine/src/games/` → add it to the architecture table
- A new npm script in `package.json` → add it to the Commands section
- A new top-level directory or major module → add it to the architecture section
- A renamed or removed file that is referenced → fix the reference

Do NOT rewrite sections that haven't changed. Do NOT add commentary about the commit itself.

### 3. Update TODO.md

Read `TODO.md`. Then:
- If the commit fixes something that was listed → mark it done or remove it
- If the commit message or diff reveals a new known issue or leftover → add it
- Keep entries short and actionable

### 4. Update memory files

Read `C:\Users\yuval.almaliah\.claude\projects\d--yuval-card-cardGame\memory\MEMORY.md`.

Update memory only if the commit changes something non-obvious that future conversations should know:
- A new architectural pattern or constraint
- A deliberate design decision (not just "added feature X")
- A fix for a recurring bug that has a non-obvious root cause

If nothing qualifies, skip this step entirely.

### 5. Report

Print a one-line summary per file updated, e.g.:
- `CLAUDE.md` — added pokerLite to architecture table
- `TODO.md` — removed "fix poker deck dock" (done)
- No memory update needed
