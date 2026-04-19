---
name: release
description: "Full release flow for claude-second-brain: resolves the next version, audits CI workflows via /update-workflows, syncs docs + ship log via /update-docs, then bumps package.json and opens a single PR containing all three commits via /package-release. Trigger phrases: /release, ship a new version, cut a release, prepare a release."
argument-hint: "Optional: patch | minor | major | exact version (e.g. 0.2.0). Leave blank for auto-suggestion."
---

# /release

Orchestrates a complete release for `claude-second-brain`:

1. Resolve the target version.
2. Run `/update-workflows` to catch `pack-test.yml` drift before CI sees it.
3. Commit any workflow edits.
4. Run `/update-docs` so the docs site and ship log reflect what's shipping (ship log entry uses the target version).
5. Commit the docs changes.
6. Run `/package-release` to bump `package.json`, commit, push, and open the PR.

The result is **one PR** containing up to three commits (workflows → docs → version) so CI passes on first push.

If you only want one half, run `/update-workflows`, `/update-docs`, or `/package-release` directly — each is usable standalone.

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

### Step 2 — Run /update-workflows

Invoke the `update-workflows` skill. When it asks for approval of its proposal, forward it to the user and wait.

If the audit reports "pack-test is in sync — nothing to update," skip to Step 4.

Let `/update-workflows` apply its edits.

### Step 3 — Commit workflow changes

If `/update-workflows` modified any files (check `git status`):

```bash
git add .github/workflows/pack-test.yml .claude/skills/pack-test/SKILL.md
git commit -m "chore(ci): sync pack-test with current repo state"
```

If nothing changed, skip this step.

### Step 4 — Run /update-docs

Invoke the `update-docs` skill. When it asks for approval of its proposal, forward that proposal to the user and wait.

**Critical:** the ship log entry for this release must use the version resolved in Step 1 (`vX.Y.Z`) and today's date. If `/update-docs` proposes a different version, correct it before approving.

Let `/update-docs` apply its edits.

### Step 5 — Commit docs changes

If `/update-docs` modified any files (check `git status`):

```bash
git add docs/ vocs.config.ts
git commit -m "chore(docs): update ship log and docs for vX.Y.Z"
```

If nothing changed, skip this step.

### Step 6 — Run /package-release

Invoke `/package-release <arg>` with the version resolved in Step 1 (e.g. `/package-release 0.8.0`). It will:

- Bump `package.json` to `X.Y.Z`
- Commit the bump (`chore: bump version to X.Y.Z`)
- Push the branch
- Open a PR — whose commit list will include any workflow commit from Step 3, any docs commit from Step 5, and the version-bump commit

### Step 7 — Report

Tell the user which commits landed in the PR — omit any step that was skipped:

> **Release PR opened:** [url]
>
> - Workflow commit: `chore(ci): sync pack-test with current repo state` *(if applicable)*
> - Docs commit: `chore(docs): update ship log and docs for vX.Y.Z` *(if applicable)*
> - Version commit: `chore: bump version to X.Y.Z`
>
> After merge, `release-publish.yml` tags `vX.Y.Z`, creates a GitHub Release, and publishes `claude-second-brain@X.Y.Z` to npm.

## What can go wrong

- **User declines workflow or docs proposal** — stop; do not proceed to `/package-release`. The branch is left with whatever has already been committed; retry after resolving the concern.
- **Version mismatch between ship log and `package.json`** — Step 4's correction gate prevents this; if it slips through, the PR reviewer will catch it. Fix by amending the docs commit before merge.
- **Nothing to release** — if `git log main..HEAD` is empty, abort.
