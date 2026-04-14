---
name: pack-test
description: "Test the claude-second-brain npm package by packing it into a tarball and running it via npx. This is the definitive test — it catches npm's .gitignore stripping behavior and validates the full scaffold. Trigger phrases: /pack-test, test the package, test the CLI, test the tarball."
argument-hint: "No arguments needed"
---

# Pack Test

Tests the npm package as it behaves when published. Uses `npx` to run from the local tarball — `bunx` doesn't support local tarball paths (it tries to resolve them as scoped package names). After publishing, `bunx claude-second-brain` from the registry works fine. Runs all steps, reports a checklist, then cleans up.

## Steps

Run each command in order. Stop and report if any step fails.

**Step 1 — Pack**

```bash
npm pack
```

Produces `claude-second-brain-<version>.tgz` in the repo root, where `<version>` comes from `package.json`. Verify the tarball appears before continuing.

**Step 2 — Scaffold via npx**

```bash
echo "" | npx -y claude-second-brain-$(node -p "require('./package.json').version").tgz test-vault
```

Use `npx` with the `file:` prefix — without it, npx tries to execute the tarball as a shell script and fails with "Permission denied". Pass `test-vault` as the target dir argument to skip the interactive folder name prompt. Pipe `echo ""` to accept the default qmd path (`~/.cache/qmd/index.sqlite`) without interactive input. The vault is created in the repo root and cleaned up in Step 4.

**Step 3 — Verify checklist**

Run each of the following and confirm the expected output:

```bash
# Root structure
ls -la test-vault/

# .gitignore must exist (not .gitignore.template — npm strips .gitignore from packages)
cat test-vault/.gitignore

# Wiki stubs
ls test-vault/wiki/

# Sources dirs
ls test-vault/sources/

# Claude Code skills (expect: brain-ingest, brain-search, lint, qmd-cli, setup)
ls test-vault/.claude/skills/

# qmd scripts
ls test-vault/scripts/qmd/

# INDEX_PATH in CLAUDE.md must be an absolute path, not relative "qmd.sqlite"
grep "INDEX_PATH=" test-vault/CLAUDE.md

# setup.ts DB must be a hardcoded absolute path, not join(VAULT, "qmd.sqlite")
grep "const DB" test-vault/scripts/qmd/setup.ts

# Global skills must be installed
ls ~/.claude/skills/brain-ingest/
ls ~/.claude/skills/brain-search/

# Global skill content must have the absolute INDEX_PATH
grep "INDEX_PATH=" ~/.claude/skills/brain-ingest/SKILL.md
```

Report results against this checklist:

| Item | Expected | Pass? |
|------|----------|-------|
| `.gitignore` | Present (not `.gitignore.template`) | |
| `wiki/index.md`, `log.md`, `overview.md` | All present | |
| `wiki/sources/` and `wiki/qa/` | Present | |
| `sources/articles/`, `pdfs/`, `personal/` | Present | |
| `.claude/skills/` — 5 subdirs | brain-ingest, brain-search, lint, qmd-cli, setup | |
| `scripts/qmd/setup.ts`, `reindex.ts`, `package.json` | All present | |
| `CLAUDE.md`, `mise.toml` | Present | |
| `CLAUDE.md` INDEX_PATH | Absolute path (not `qmd.sqlite`) | |
| `scripts/qmd/setup.ts` DB const | Hardcoded absolute path (not `join(VAULT, ...)`) | |
| `~/.claude/skills/brain-ingest/SKILL.md` | Present with absolute INDEX_PATH | |
| `~/.claude/skills/brain-search/SKILL.md` | Present with absolute INDEX_PATH | |

**Step 4 — Clean up**

```bash
rm -rf test-vault
rm claude-second-brain-$(node -p "require('./package.json').version").tgz
rm -rf ~/.claude/skills/brain-ingest
rm -rf ~/.claude/skills/brain-search
```

> **Note:** If you had pre-existing `brain-ingest` / `brain-search` global skills from a real vault, they were overwritten by this test. Re-run `/setup` inside your real vault to restore them.

## What failure means

- **`.gitignore.template` present instead of `.gitignore`** — npm stripped `.gitignore` from the tarball but the rename in `bin/create.js` didn't fire; check the `try/catch` rename block
- **Missing skill dirs** — template copy failed or `.claude/` hidden dir wasn't included; check `npm pack --dry-run` output
- **`npx` fails to run the bin** — shebang or `bin` field in `package.json` is wrong; check `#!/usr/bin/env node` on line 1 of `bin/create.js`
- **`qmd.sqlite` still in CLAUDE.md or skill files** — `patchVault()` didn't run or the replaceAll target string didn't match; check for typos in the patch targets in `bin/create.js`
- **Global skills not installed** — `installGlobalSkills()` failed; check that `~/.claude/skills/` is writable and template skill dirs are named `brain-ingest`/`brain-search`
- **`join(VAULT, ...)` still in setup.ts** — the DB line patch didn't match; verify the exact string `const DB = join(VAULT, "qmd.sqlite")` exists in the template
- **Note:** `bunx` cannot run local tarballs — use `npx` for this test. After publishing, `bunx claude-second-brain` from the registry works fine.
