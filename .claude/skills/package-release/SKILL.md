---
name: package-release
description: "Bump the claude-second-brain npm package version and open a release PR. Analyzes changes vs main, suggests a semver bump, updates package.json, commits, pushes, and opens the PR. Does NOT touch docs — for a full release including docs + ship log, use /release. Trigger phrases: /package-release, bump the npm version, bump the package version, open a package release PR."
argument-hint: "Optional: patch | minor | major | exact version (e.g. 0.2.0). Leave blank for auto-suggestion."
---

# /package-release

Bumps the npm package version and opens a release PR for `claude-second-brain`. Does **not** publish to npm directly — publishing happens automatically via GitHub Actions after the PR is merged.

This skill only touches `package.json`. If you also want the docs ship log updated in the same PR, run `/release` instead — it orchestrates `/update-docs` and this skill together.

## When to use

- You've already synced docs (or don't need to) and just want to cut a version.
- The current branch must have commits relative to `main`.
- For the full combined flow (docs + version), prefer `/release`.

## Argument

Pass a version bump type to skip the confirmation prompt:

| Argument | Effect |
|----------|--------|
| (none) | Analyze changes and suggest a bump; ask user to confirm |
| `patch` | Bump patch version (e.g. 0.1.0 → 0.1.1) |
| `minor` | Bump minor version (e.g. 0.1.0 → 0.2.0) |
| `major` | Bump major version (e.g. 0.1.0 → 1.0.0) |
| `0.3.0` | Use this exact version |

## Steps

Run each step in order. Stop and report if any step fails.

### Step 1 — Capture current state

Run these commands to understand what's changed:

```bash
# Current branch
git branch --show-current

# Commits on this branch not yet in main
git log main..HEAD --oneline

# File-level diff summary vs main
git diff main...HEAD --stat

# Current version
cat package.json | grep '"version"'
```

Record: the branch name, current version, list of commits, and all files changed.

### Step 2 — Summarize changes

Categorize all changes from Step 1 into this format:

```
## Changes in this release

**New features:**
- (e.g. new skill added, new CLI flag, new template file)

**Bug fixes:**
- (e.g. correctness fix in bin/create.ts, template fix)

**Refactors / cleanup:**
- (e.g. code reorganization, no behavior change)

**Docs:**
- (e.g. README updates, CLAUDE.md edits)
```

Show this changelog to the user. Skip empty categories.

### Step 3 — Determine version bump

Read the current version from `package.json`. Apply semver logic to suggest the next version:

| Signal | Bump |
|--------|------|
| Changes to CLI interface, template structure that would break existing vaults, or commits containing "breaking" | **major** |
| New skills added, new CLI flags, new template sections, or new behavior | **minor** |
| Bug fixes, docs, refactors only | **patch** |

State clearly:
- Current version: `X.Y.Z`
- Suggested next version: `A.B.C` (reason)

**If the user passed an argument** (`/package-release patch`, `/package-release 0.2.0`, etc.), use that directly and skip asking.

**If no argument**, ask the user to confirm the suggested version before continuing. Do not proceed to Step 4 until confirmed.

### Step 4 — Update package.json

Use the Edit tool to update the `"version"` field in `package.json` to the new version. Do not reformat the file.

Verify:
```bash
cat package.json | grep '"version"'
```

### Step 5 — Commit the version bump

```bash
git add package.json
git commit -m "chore: bump version to X.Y.Z"
```

Replace `X.Y.Z` with the confirmed new version.

### Step 6 — Push and open PR

Push the current branch:

```bash
git push origin HEAD
```

Create a PR targeting `main`. Use the changelog from Step 2 in the body:

```bash
gh pr create \
  --title "release: vX.Y.Z" \
  --body "$(cat <<'EOF'
## Release vX.Y.Z

### Changes

[changelog from Step 2]

### What happens after merge

1. GitHub Action creates tag `vX.Y.Z` and a GitHub Release with auto-generated notes
2. GitHub Action publishes `claude-second-brain@X.Y.Z` to npm automatically

### Checklist

- [ ] Changelog accurately reflects all changes
- [ ] `package.json` version is correct
EOF
)" \
  --base main
```

### Step 7 — Report to user

After the PR is created, tell the user:

> **PR opened:** [url]
>
> **Pipeline after merge:**
> 1. `release-publish.yml` creates tag `vX.Y.Z`, a GitHub Release, and publishes `claude-second-brain@X.Y.Z` to npm
>
> **To verify after merge:** https://www.npmjs.com/package/claude-second-brain

## What can go wrong

- **`gh` not authenticated** — run `gh auth login` first
- **Nothing to release** — `git log main..HEAD` is empty; make sure you're on the right branch
- **Merge conflicts with main** — rebase on main before running `/package-release`
- **Pack-test version mismatch** — Step 5 handles this; the grep verify confirms it
