---
name: implement-github-issue
description: Full end-to-end workflow for implementing a GitHub issue on any project: read issue, explore codebase, plan tasks, branch, implement, identify backend/frontend changes, code review, fix, commit, push, and open PR.
user-invocable: true
---

You are executing a complete GitHub issue implementation workflow. Follow every phase below in order. Do not skip phases.

## Phase 1 — Read the Issue

Use the `github-mcp-server-issue_read` tool (method: `get`) to read the specified issue. Extract:
- The feature or fix being requested
- All acceptance criteria (scenarios, rules, requirements)
- Any background or context sections

## Phase 2 — Explore the Codebase

Before touching any code, use `explore` sub-agents (in parallel where possible) to understand:
- Which existing files are relevant to the issue
- How the current implementation works
- What patterns, conventions, architecture, and naming style the project uses
- What dependencies or libraries are already in use that should be leveraged

Do **not** guess at implementation details. Read the actual code first.

## Phase 3 — Create a Task List

Insert implementation todos into the SQL `todos` table before writing a single line of code:

```sql
INSERT INTO todos (id, title, description, status) VALUES
  ('task-id', 'Short title', 'Detailed description of exactly what to do and where', 'pending');
```

Use descriptive kebab-case IDs. Include enough detail in `description` that each todo can be executed without referring back to this conversation. Add rows to `todo_deps` when ordering matters.

Also identify any **cross-layer changes** required — for example, if working on a frontend feature, note any backend API changes needed (new endpoints, schema fields, new response data), and vice versa. These will become separate GitHub issues on the appropriate repository in Phase 5.

## Phase 4 — Checkout a Feature Branch

Always branch from the project's integration branch (typically `dev`, not `main`). Check the project's branching convention if unsure:

```
git checkout <integration-branch> && git pull && git checkout -b feat/<short-description>
```

Use `feat/` prefix for features, `fix/` prefix for bug fixes.

## Phase 5 — Create Cross-Layer Issues (if needed)

If Phase 3 identified changes required in a different layer or repository (e.g., a backend API change needed by a frontend feature, or a client contract change needed by a backend feature), create a GitHub issue on the appropriate repository using `gh issue create --repo <owner>/<repo>`.

The issue body must:
- Describe the context and why the change is needed
- Use **Gherkin** (`Feature:` / `Scenario:` / `Given`/`When`/`Then`) to specify every required behavior, including authentication, error cases, backwards compatibility, and data isolation between users/tenants
- List all required implementation changes (endpoints, schema fields, DTOs, migrations)
- Describe the impact on the consuming layer (e.g., "the frontend will send `percentage` in the request body")

Write the body to a temp file first to avoid shell escaping issues:
```
gh issue create --repo <owner>/<repo> --title "..." --body-file <path> --label enhancement
```

## Phase 6 — Implement

Mark each todo `in_progress` before starting it, `done` when complete:

```sql
UPDATE todos SET status = 'in_progress' WHERE id = 'task-id';
-- ... implement ...
UPDATE todos SET status = 'done' WHERE id = 'task-id';
```

Implementation rules:
- Make the **smallest possible change** that satisfies the requirement
- Follow every naming and style convention already present in the codebase — never use abbreviated variable names, never use single-letter variables (except conventional loop indices like `i`), match the existing naming style exactly
- Never delete or modify working code that is unrelated to the issue
- Do **not** commit AI assistant config files (`.claude/`, `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`). Add them to `.gitignore` if not already present.

## Phase 7 — Validate

Run the project's validation commands — whatever exists for this project (typecheck, build, lint, tests):

```
# Examples — use what the project actually has:
npm run typecheck
npm run build
npm run test
go test ./...
cargo check
pytest
```

Fix any errors introduced by your changes. Do **not** fix pre-existing unrelated failures.

## Phase 8 — Code Review

Spawn a `code-review` sub-agent to review only the changes on this branch:

```
"Review the changes on branch <branch-name> for issue #<N> in <repo>.
Focus on: bugs, memory leaks, missing cleanup, event listener leaks,
incorrect assumptions, edge cases, null/empty guard conditions, and type safety.
Do NOT comment on style or formatting."
```

## Phase 9 — Fix Review Issues

For each issue the code review agent reports:
1. Understand the root cause
2. Apply the minimal fix
3. Scan the **entire set of changed files** for the same class of problem — not just the flagged line
4. Re-run the project's validation commands after fixes

## Phase 10 — Commit, Push, and Open PR

Stage all changes (excluding ignored files), then commit:

```
git add -A
git commit -m "<type>: <summary> (#<issue-number>)

- Bullet describing each logical change
- ...

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push -u origin <branch-name>
```

Before opening a PR, verify the git remote URL is correct (`git remote -v`). If the repository has moved, update it:
```
git remote set-url origin <correct-url>
```

Write the PR body to a temp file, then open the PR targeting the integration branch:

```
gh pr create --base <integration-branch> --title "<type>: <title> (#<N>)" --body-file <path>
```

The PR body should include:
- A summary of what was implemented
- Each acceptance scenario from the issue marked ✅ or ❌
- A reference to any cross-layer issue created in Phase 5

## Rules That Apply Throughout All Phases

- **Never abbreviate variable names.** Write `percentage`, not `pct`. Write `progress`, not `p`. Write `location`, not `loc`. Write `index`, not `idx`. Write `error`, not `err`. Match the full-word naming style used in the existing codebase.
- **Never commit** `.claude/`, `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`. Always add them to `.gitignore`.
- **Always write multi-line CLI arguments to a temp file** (issue body, PR body) to avoid shell escaping issues — never inline long `--body` strings directly in the shell.
- **Always add `Co-authored-by: Copilot`** trailer to every commit message.
- **Always verify git remote URLs** match the actual repository location before pushing or creating PRs.
- **Never fix pre-existing bugs** unrelated to the issue being implemented.
- **Always update todo status** (`in_progress` → `done`) as you work through Phase 6.
