---
name: release
description: "Full release flow for claude-second-brain: resolves the next version, updates the docs site + ship log via /update-docs, then bumps package.json and opens a single PR containing both the docs commit and the version bump via /package-release. Trigger phrases: /release, ship a new version, cut a release, prepare a release."
argument-hint: "Optional: patch | minor | major | exact version (e.g. 0.2.0). Leave blank for auto-suggestion."
---

# /release

Orchestrates a complete release for `claude-second-brain`:

1. Resolve the target version.
2. Run `/update-docs` so the docs site and ship log reflect what's shipping (ship log entry uses the target version).
3. Commit the docs changes.
4. Run `/package-release` to bump `package.json`, commit, push, and open the PR.

The result is **one PR** containing both the docs commit and the version-bump commit.

If you only want one half, run `/update-docs` or `/package-release` directly — each is usable standalone.

## Preconditions

- Current branch has commits relative to `main`.
- Working tree is otherwise clean (no unrelated staged/unstaged changes — the orchestrator will commit anything staged).

## Steps

### Step 1 — Resolve target version

Read the current version:

```bash
cat package.json | grep '"version"'
```

Apply the same semver logic `/package-release` uses:

| Signal | Bump |
|--------|------|
| Breaking CLI / template changes, or commits containing "breaking" | **major** |
| New skills, new CLI flags, new template sections, or new behavior | **minor** |
| Bug fixes, docs, refactors only | **patch** |

**If the user passed an argument** (`/release patch`, `/release 0.2.0`, etc.) use it directly.
**Otherwise** summarize the diff (`git log main..HEAD --oneline` + `git diff main...HEAD --stat`), suggest a bump, and ask the user to confirm. Do not continue until confirmed.

Record the resolved version as `vX.Y.Z` for the rest of the flow.

### Step 2 — Run /update-docs

Invoke the `update-docs` skill. When it asks for approval of its proposal, forward that proposal to the user and wait.

**Critical:** the ship log entry for this release must use the version resolved in Step 1 (`vX.Y.Z`) and today's date. If `/update-docs` proposes a different version, correct it before approving.

Let `/update-docs` apply its edits.

### Step 3 — Commit docs changes

If `/update-docs` modified any files (check `git status`):

```bash
git add docs/ vocs.config.ts
git commit -m "chore(docs): update ship log and docs for vX.Y.Z"
```

If nothing changed, skip this step.

### Step 4 — Run /package-release

Invoke `/package-release <arg>` with the version resolved in Step 1 (e.g. `/package-release 0.8.0`). It will:

- Bump `package.json` to `X.Y.Z`
- Commit the bump (`chore: bump version to X.Y.Z`)
- Push the branch
- Open a PR — whose commit list will include both your docs commit from Step 3 and the version-bump commit

### Step 5 — Report

Tell the user:

> **Release PR opened:** [url]
>
> - Docs commit: `chore(docs): update ship log and docs for vX.Y.Z`
> - Version commit: `chore: bump version to X.Y.Z`
>
> After merge, `release-publish.yml` tags `vX.Y.Z`, creates a GitHub Release, and publishes `claude-second-brain@X.Y.Z` to npm.

## What can go wrong

- **User declines docs proposal** — stop; do not proceed to `/package-release`. The branch is left with no changes and can be retried.
- **Version mismatch between ship log and `package.json`** — Step 2's correction gate prevents this; if it slips through, the PR reviewer will catch it. Fix by amending the docs commit before merge.
- **Nothing to release** — if `git log main..HEAD` is empty, abort.
