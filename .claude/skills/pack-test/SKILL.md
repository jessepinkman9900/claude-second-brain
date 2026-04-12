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

Produces `obsidian-agent-wiki-0.1.0.tgz` in the repo root. Verify the tarball appears before continuing.

**Step 2 — Scaffold via npx**

```bash
cd /tmp && npx /Users/srinivaskota/work/obsidian-agent-wiki/obsidian-agent-wiki-0.1.0.tgz test-vault
```

Use `npx`, not `bunx` — bunx cannot resolve local tarball paths (it prepends `@` and treats them as scoped package names). Pass `test-vault` as the target dir argument to skip the interactive prompt.

**Step 3 — Verify checklist**

Run each of the following and confirm the expected output:

```bash
# Root structure
ls -la /tmp/test-vault/

# .gitignore must exist (not .gitignore.template — npm strips .gitignore from packages)
cat /tmp/test-vault/.gitignore

# Wiki stubs
ls /tmp/test-vault/wiki/

# Sources dirs
ls /tmp/test-vault/sources/

# Claude Code skills (expect: setup, ingest, query, lint, qmd-cli)
ls /tmp/test-vault/.claude/skills/

# qmd scripts
ls /tmp/test-vault/scripts/qmd/
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
rm -rf /tmp/test-vault
rm /Users/srinivaskota/work/obsidian-agent-wiki/obsidian-agent-wiki-0.1.0.tgz
```

## What failure means

- **`.gitignore.template` present instead of `.gitignore`** — npm stripped `.gitignore` from the tarball but the rename in `bin/create.ts` didn't fire; check the `try/catch` rename block
- **Missing skill dirs** — template copy failed or `.claude/` hidden dir wasn't included; check `npm pack --dry-run` output
- **`npx` fails to run the bin** — shebang or `bin` field in `package.json` is wrong; check `#!/usr/bin/env bun` on line 1 of `bin/create.ts`
- **Note:** `bunx` cannot run local tarballs — use `npx` for this test. After publishing, `bunx obsidian-agent-wiki` from the registry works fine.
