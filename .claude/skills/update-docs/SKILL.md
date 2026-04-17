---
name: update-docs
description: "Audit docs/ for missing coverage of recently shipped features and missing ship log entries. Reviews changes vs main, identifies gaps, proposes updates, waits for user approval, then applies them. Trigger phrases: /update-docs, update the docs, sync the docs, docs are out of date."
---

# /update-docs

Audits the docs site for two things: features that shipped but aren't documented yet, and ship log versions that are missing or incomplete. Proposes all changes and waits for user approval before writing anything.

## Steps

Run each step in order.

---

### Step 1 — Gather current state

Run all of these in parallel:

```bash
# Commits on this branch not in main
git log main..HEAD --oneline

# All changed files vs main
git diff main...HEAD --stat

# Current package.json version
cat package.json | grep '"version"'
```

Also read:
- `docs/pages/ship-log.mdx` — to find the latest documented version
- `docs/pages/getting-started.mdx` — to check if CLI prompts/options are current
- `vocs.config.ts` — to see what pages exist in the sidebar

Glob `docs/pages/**/*.mdx` to get the full list of doc pages.

---

### Step 2 — Identify docs gaps

Compare the commits and changed files from Step 1 against the existing doc pages.

For **each significant change** (new CLI flag, new prompt, new skill, new remote option, new behavior), ask:

> Is this change documented in any page under `docs/pages/`?

List every gap as:
```
GAP: <what changed> — not covered in docs
```

Also check `getting-started.mdx` for accuracy:
- Does the CLI prompts list match the current wizard sequence?
- Are all remote options mentioned?

---

### Step 3 — Identify missing ship log entries

Read `docs/pages/ship-log.mdx` and find the latest version recorded.

Compare against `package.json` version. If the current version is higher than the latest ship log entry, it is missing.

Also check: does each existing entry accurately reflect what actually shipped? Look at the commits grouped by version tag (`git log --oneline --decorate`) and flag any entries that are incomplete or say "maintenance release only" when they contain real changes.

List each gap as:
```
MISSING: ship log entry for vX.Y.Z
INCOMPLETE: vX.Y.Z entry — missing: <what's not captured>
```

---

### Step 4 — Propose changes

Present a consolidated proposal to the user:

```
## Docs update proposal

### New / updated doc pages
- <file>: <what to add or change>
- ...

### Ship log additions
- vX.Y.Z — <date>: <summary of changes>
- ...
```

**Stop here and wait for user approval.** Do not write anything until the user confirms.

If the user asks to skip certain items or adjust the proposal, incorporate the feedback before proceeding.

---

### Step 5 — Apply approved changes

For each approved item:

**Doc page changes:**
- If the page exists: use Edit to add or update the relevant section.
- If a new page is needed: create it under `docs/pages/` and add it to the sidebar in `vocs.config.ts`.

**Ship log additions:**
- Edit `docs/pages/ship-log.mdx`.
- Insert new entries at the top (newest first), following the existing format:
  ```markdown
  ## vX.Y.Z — YYYY-MM-DD

  **Features:**
  - ...

  **Fixes:**
  - ...
  ```
- Use today's date for unreleased versions that are being prepared.
- Skip empty categories.

---

### Step 6 — Report

Tell the user what was changed:
- List each file edited and what was added.
- Note anything skipped and why.

## What can go wrong

- **No commits vs main** — if on main with nothing ahead, Step 1 returns empty; report "nothing to document" and stop.
- **Version already in ship log** — if the current version matches the latest ship log entry and no gaps were found, report "docs appear up to date" and stop.
