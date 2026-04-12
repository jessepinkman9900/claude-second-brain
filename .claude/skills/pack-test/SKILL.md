---
name: pack-test
description: "Test the obsidian-agent-wiki npm package by packing it into a tarball and running it via npx. This is the definitive test — it catches npm's .gitignore stripping behavior and validates the full scaffold. Trigger phrases: /pack-test, test the package, test the CLI, test the tarball."
argument-hint: "No arguments needed"
---

# Pack Test

Tests the npm package as it behaves when published. Uses `npx` to run from the local tarball — `bunx` doesn't support local tarball paths (it tries to resolve them as scoped package names). After publishing, `bunx obsidian-agent-wiki` from the registry works fine. Runs all steps, reports a checklist, then cleans up.

## Steps

Run each command in order. Stop and report if any step fails.

**Step 1 — Pack**

```bash
npm pack
```

Produces `obsidian-agent-wiki-<version>.tgz` in the repo root, where `<version>` comes from `package.json`. Verify the tarball appears before continuing.

**Step 2 — Scaffold via npx**

```bash
npx -y obsidian-agent-wiki-$(node -p "require('./package.json').version").tgz test-vault
```

Use `npx` with the `file:` prefix — without it, npx tries to execute the tarball as a shell script and fails with "Permission denied". Pass `test-vault` as the target dir argument to skip the interactive prompt. The vault is created in the repo root and cleaned up in Step 4.

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

# Claude Code skills (expect: setup, ingest, query, lint, qmd-cli)
ls test-vault/.claude/skills/

# qmd scripts
ls test-vault/scripts/qmd/
```

Report results against this checklist:

| Item | Expected | Pass? |
|------|----------|-------|
| `.gitignore` | Present (not `.gitignore.template`) | |
| `wiki/index.md`, `log.md`, `overview.md` | All present | |
| `wiki/sources/` and `wiki/qa/` | Present | |
| `sources/articles/`, `pdfs/`, `personal/` | Present | |
| `.claude/skills/` — 5 subdirs | setup, ingest, query, lint, qmd-cli | |
| `scripts/qmd/setup.ts`, `reindex.ts`, `package.json` | All present | |
| `CLAUDE.md`, `mise.toml` | Present | |

**Step 4 — Clean up**

```bash
rm -rf test-vault
rm obsidian-agent-wiki-$(node -p "require('./package.json').version").tgz
```

## What failure means

- **`.gitignore.template` present instead of `.gitignore`** — npm stripped `.gitignore` from the tarball but the rename in `bin/create.js` didn't fire; check the `try/catch` rename block
- **Missing skill dirs** — template copy failed or `.claude/` hidden dir wasn't included; check `npm pack --dry-run` output
- **`npx` fails to run the bin** — shebang or `bin` field in `package.json` is wrong; check `#!/usr/bin/env node` on line 1 of `bin/create.js`
- **Note:** `bunx` cannot run local tarballs — use `npx` for this test. After publishing, `bunx obsidian-agent-wiki` from the registry works fine.
