---
name: update-workflows
description: "Audit .github/workflows/pack-test.yml (and its coupled .claude/skills/pack-test/SKILL.md) against current repo state — skill layout, GLOBAL_SKILLS, bin names, grep/absent patterns. Reports drift, proposes edits, waits for user approval, then applies them. Trigger phrases: /update-workflows, check workflows, audit pack-test, workflows out of date."
---

# /update-workflows

Audits `pack-test.yml` — the workflow most prone to silent drift — against the current repo state and proposes fixes. Other workflows (`release-publish.yml`, `docs-deploy.yml`, `docs-preview.yml`) are generic and not covered here; inspect them manually if you've touched them.

Proposes all changes and waits for user approval before writing anything.

## Steps

Run each step in order.

---

### Step 1 — Gather current repo state

Run all of these in parallel:

```bash
# Vault-local skills shipped in the template
ls template/.claude/skills/

# Top-level template subdirs that pack-test `ls`-checks
ls template/
ls template/scripts/qmd/ 2>/dev/null || true

# Global skills list and bin names
grep -n 'GLOBAL_SKILLS' bin/create.js
jq -r '.bin | keys[]' package.json
jq -r '.version' package.json
```

Also read:
- `.github/workflows/pack-test.yml` — the workflow being audited
- `.claude/skills/pack-test/SKILL.md` — coupled checklist/counts
- A representative global skill (e.g. `template/.claude/skills/brain-ingest/SKILL.md`) — to verify `grep_check` patterns still match

---

### Step 2 — Audit

For each item below, mark `OK` or `DRIFT`. Record every `DRIFT` with the exact pack-test line that's wrong and what it should be.

**Vault-local skill coverage (`pack-test.yml` `check ".claude/skills/<name>"` lines):**
- Every dir in `template/.claude/skills/` has a matching `check` line.
- No `check` line points at a dir that no longer exists.

**Global skill coverage (`pack-test.yml` `check "~/.claude/skills/<name>/SKILL.md"` + `.csb-version` lines):**
- Every name in `GLOBAL_SKILLS` (from `bin/create.js`) has both a `SKILL.md` check and a `.csb-version` check.
- No extra names appear that aren't in `GLOBAL_SKILLS`.
- Corresponding `grep_check` / `absent_check` loops iterate the same set.

**`grep_check` patterns:**
- Each pattern (`claude-second-brain path`, `claude-second-brain qmd`, etc.) still appears in at least one shipped global skill under `template/.claude/skills/`.

**`absent_check` patterns:**
- Each pattern (`__QMD_PATH__`, `__CSB_CONFIG__`, `INDEX_PATH=\$QMD_INDEX`) still doesn't appear in any shipped file. (A stale `absent_check` for a token that no longer exists anywhere is harmless but noisy — optional to clean up.)

**Bin names:**
- Every bin name referenced in `pack-test.yml` (e.g. `claude-second-brain`, `csb`) exists as a key in `package.json`'s `bin` object.

**`pack-test/SKILL.md` coupling:**
- The expected-skills comment lists the same set as `template/.claude/skills/`.
- The `ls` and `grep` commands in Step 3 reference current paths.
- The checklist table's "N subdirs" count matches the actual `ls template/.claude/skills/ | wc -l`.
- The cleanup `rm -rf` line in Step 4 targets the current `GLOBAL_SKILLS` set.

---

### Step 3 — Propose changes

Present a consolidated proposal:

```
## Workflow audit proposal

### .github/workflows/pack-test.yml
- DRIFT: <specific line> — <what's wrong> → <proposed fix>
- ...

### .claude/skills/pack-test/SKILL.md
- DRIFT: <specific line/section> — <what's wrong> → <proposed fix>
- ...
```

If everything is `OK`, report "pack-test is in sync — nothing to update" and stop.

**Stop here and wait for user approval** before applying any edits. If the user wants to skip items, drop them from the list before continuing.

---

### Step 4 — Apply approved edits

Use Edit on:
- `.github/workflows/pack-test.yml`
- `.claude/skills/pack-test/SKILL.md`

**Do not** edit other workflows, other skills, or source files. If the audit surfaced drift elsewhere (e.g. a `grep_check` pattern that's truly gone from every skill), flag it in the report — don't fix it here.

---

### Step 5 — Report

Tell the user:
- Files edited and what was changed on each.
- Anything flagged but not fixed (and why).

## What can go wrong

- **No drift found** — Step 2 produces all `OK`; report and stop without touching anything.
- **Ambiguous fix** — if the audit finds drift but multiple corrections are plausible (e.g. a `grep_check` pattern that could be renamed or deleted), ask the user rather than guessing.
- **Other workflow changes on this branch** — not in scope; mention them in the Step 5 report so the user knows to review manually.
