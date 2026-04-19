---
name: pack-test
description: "Test the claude-second-brain npm package by packing it into a tarball and running it via npx. Exercises the full multi-brain scaffold flow end-to-end: scaffolds a brain, verifies config.toml, global skills, and local patches, then scaffolds a second brain to validate config upsert. Trigger phrases: /pack-test, test the package, test the CLI, test the tarball."
argument-hint: "No arguments needed"
---

# Pack Test

Tests the npm package as it behaves when published. Uses `npx` to run from the local tarball — `pnpm dlx` doesn't support local tarball paths (it tries to resolve them as scoped package names). After publishing, `pnpm dlx claude-second-brain` from the registry works fine.

Multi-brain architecture: brains live at `~/.claude-second-brain/<name>/` and are registered in `~/.claude-second-brain/config.toml`. Global skills (`~/.claude/skills/brain-*`) are plain SKILL.md files with a sibling `.csb-version` sidecar. They resolve paths at call time via the `claude-second-brain path` and `claude-second-brain qmd` subcommands — no paths are baked into the skills themselves.

**Important:** This test mutates `~/.claude-second-brain/` and `~/.claude/skills/brain-*`. If the user has real brains registered, warn them before running — cleanup removes `config.toml` and the test brains, which does NOT delete their real brain folders but DOES remove their registry entries and overwrite their global skills.

## Steps

Run each step in order. Stop and report if any step fails.

### Step 1 — Pre-flight: back up existing state

```bash
# If the user has existing brains, these are affected:
ls -la ~/.claude-second-brain/ 2>/dev/null || echo "(no existing brains)"
cat ~/.claude-second-brain/config.toml 2>/dev/null || echo "(no existing config)"
```

If `config.toml` exists with real brains, back it up so the test cleanup doesn't lose them:

```bash
cp ~/.claude-second-brain/config.toml ~/.claude-second-brain/config.toml.bak 2>/dev/null || true
```

### Step 2 — Pack

```bash
npm pack
```

Produces `claude-second-brain-<version>.tgz` in the repo root. Verify the tarball appears before continuing.

### Step 3 — Scaffold first brain

```bash
npx -y claude-second-brain-$(node -p "require('./package.json').version").tgz test-brain-a
```

Pass `test-brain-a` as the brain name argument to skip the interactive prompt. Non-TTY stdin skips the GitHub prompt. The brain is created at `~/.claude-second-brain/test-brain-a/`.

**Assertion:** The CLI output should include `cd ~/.claude-second-brain/test-brain-a` in the Next steps section — not `cd test-brain-a`.

### Step 4 — Verify single-brain scaffold

```bash
VAULT_A=~/.claude-second-brain/test-brain-a

# Brain is in the correct location (NOT in CWD)
[ -d "$VAULT_A" ] && echo "PASS: brain at $VAULT_A" || echo "FAIL: brain not at $VAULT_A"
[ ! -d "./test-brain-a" ] && echo "PASS: brain not in CWD" || echo "FAIL: brain leaked into CWD"

# .gitignore renamed from .gitignore.template
[ -f "$VAULT_A/.gitignore" ] && echo "PASS: .gitignore present" || echo "FAIL: .gitignore missing"

# Wiki stubs, raw-sources dirs, local skills, scripts
ls $VAULT_A/wiki/ $VAULT_A/raw-sources/ $VAULT_A/.claude/skills/ $VAULT_A/scripts/qmd/

# Scripts use a relative .qmd path — no absolute path substitution
grep "\.qmd/index\.sqlite" $VAULT_A/scripts/qmd/setup.ts
grep "\.qmd/index\.sqlite" $VAULT_A/scripts/qmd/reindex.ts

# CLAUDE.md references the relative path too
grep "INDEX_PATH=\.qmd/index\.sqlite" $VAULT_A/CLAUDE.md | head -1

# No lingering tokens anywhere in the vault
! grep -r "__QMD_PATH__\|__CSB_CONFIG__\|__BRAIN_NAME__" $VAULT_A/ 2>/dev/null \
  && echo "PASS: no unpatched tokens" \
  || echo "FAIL: unpatched tokens found above"
```

### Step 5 — Verify config.toml was created

```bash
CONFIG=~/.claude-second-brain/config.toml

[ -f "$CONFIG" ] && echo "PASS: config.toml created" || echo "FAIL: config.toml missing"
cat $CONFIG

# Assertions on content
grep -q 'default = "test-brain-a"' $CONFIG && echo "PASS: default brain set" || echo "FAIL: default not set"
grep -q 'name = "test-brain-a"' $CONFIG && echo "PASS: brain entry exists" || echo "FAIL: no brain entry"
grep -q "path = \"$HOME/.claude-second-brain/test-brain-a\"" $CONFIG && echo "PASS: path correct" || echo "FAIL: path wrong"
grep -q "qmd_index = \"$HOME/.claude-second-brain/test-brain-a/.qmd/index.sqlite\"" $CONFIG && echo "PASS: qmd_index correct" || echo "FAIL: qmd_index wrong"
```

### Step 6 — Verify global skills are CLI-backed

```bash
for skill in brain-ingest brain-search brain-refresh; do
  FILE=~/.claude/skills/$skill/SKILL.md
  SIDECAR=~/.claude/skills/$skill/.csb-version
  [ -f "$FILE" ] || { echo "FAIL: $FILE missing"; continue; }

  # Must reference the `claude-second-brain` CLI for path / qmd resolution
  grep -q "claude-second-brain path" $FILE && echo "PASS: $skill uses \`claude-second-brain path\`" || echo "FAIL: $skill missing CLI path resolution"
  grep -q "claude-second-brain qmd" $FILE && echo "PASS: $skill uses \`claude-second-brain qmd\`" || echo "FAIL: $skill missing CLI qmd proxy"

  # No lingering tokens, no baked absolute paths
  ! grep -q "__QMD_PATH__\|__CSB_CONFIG__\|INDEX_PATH=\$QMD_INDEX\|INDEX_PATH=/" $FILE && echo "PASS: $skill clean" || echo "FAIL: $skill still has legacy substitutions"

  # Version sidecar exists and matches package version
  [ -f "$SIDECAR" ] && echo "PASS: $skill .csb-version present" || echo "FAIL: $skill missing .csb-version"
  PKG_VER=$(node -p "require('./package.json').version")
  grep -q "\"version\": \"$PKG_VER\"" $SIDECAR && echo "PASS: $skill version matches package" || echo "FAIL: $skill version mismatch"
done
```

### Step 7 — Scaffold second brain (multi-brain upsert test)

```bash
npx -y claude-second-brain-$(node -p "require('./package.json').version").tgz test-brain-b
```

### Step 8 — Verify config.toml upsert

```bash
CONFIG=~/.claude-second-brain/config.toml
cat $CONFIG

# default should STILL be test-brain-a (first brain stays default)
grep -q 'default = "test-brain-a"' $CONFIG && echo "PASS: default unchanged" || echo "FAIL: default was overwritten"

# Both brains should be registered
grep -c '^\[\[brains\]\]' $CONFIG
[ "$(grep -c '^\[\[brains\]\]' $CONFIG)" = "2" ] && echo "PASS: 2 brains registered" || echo "FAIL: expected 2 brain entries"

grep -q 'name = "test-brain-a"' $CONFIG && echo "PASS: brain-a entry exists" || echo "FAIL: brain-a missing"
grep -q 'name = "test-brain-b"' $CONFIG && echo "PASS: brain-b entry exists" || echo "FAIL: brain-b missing"
```

### Step 9 — Verify CLI subcommands resolve the default brain

```bash
RESOLVED_ROOT=$(npx -y claude-second-brain-$(node -p "require('./package.json').version").tgz path)
[ "$RESOLVED_ROOT" = "$HOME/.claude-second-brain/test-brain-a" ] && echo "PASS: path resolves default brain" || echo "FAIL: path returned '$RESOLVED_ROOT'"

RESOLVED_QMD=$(npx -y claude-second-brain-$(node -p "require('./package.json').version").tgz path --qmd)
[ "$RESOLVED_QMD" = "$HOME/.claude-second-brain/test-brain-a/.qmd/index.sqlite" ] && echo "PASS: path --qmd resolves default brain" || echo "FAIL: path --qmd returned '$RESOLVED_QMD'"

RESOLVED_B=$(npx -y claude-second-brain-$(node -p "require('./package.json').version").tgz path --brain test-brain-b)
[ "$RESOLVED_B" = "$HOME/.claude-second-brain/test-brain-b" ] && echo "PASS: --brain overrides default" || echo "FAIL: --brain returned '$RESOLVED_B'"
```

### Step 10 — Final checklist

| Item | Expected | Pass? |
|---|---|---|
| `~/.claude-second-brain/test-brain-a/` | Present | |
| `~/.claude-second-brain/test-brain-b/` | Present | |
| Brain NOT leaked into CWD | `./test-brain-a` does not exist | |
| `.gitignore` (not `.gitignore.template`) | Present in both brains | |
| `wiki/{index,log,overview}.md`, `sources/`, `qa/` | Present in both brains | |
| `raw-sources/{articles,pdfs,personal}/` | Present in both brains | |
| `.claude/skills/` — 6 subdirs | brain-ingest, brain-search, brain-refresh, brain-rebuild, lint, setup | |
| `scripts/qmd/{setup,reindex}.ts` | Present in both brains, DB hardcoded to `.qmd/index.sqlite` relative | |
| `CLAUDE.md`, `mise.toml`, `package.json` | Present in both brains | |
| `CLAUDE.md` INDEX_PATH | Relative `INDEX_PATH=.qmd/index.sqlite` (no absolute substitution) | |
| No unpatched tokens | No `__QMD_PATH__`, `__CSB_CONFIG__`, `__BRAIN_NAME__` anywhere in vault | |
| `~/.claude-second-brain/config.toml` | Present with `default = "test-brain-a"` and 2 `[[brains]]` entries | |
| Global skills (`~/.claude/skills/brain-{ingest,search,refresh}/SKILL.md`) | Present; reference `claude-second-brain path` + `claude-second-brain qmd`; `.csb-version` sidecar matches package version | |

### Step 11 — Clean up

```bash
rm -rf ~/.claude-second-brain/test-brain-a
rm -rf ~/.claude-second-brain/test-brain-b
rm -f ~/.claude-second-brain/config.toml
rm -rf ~/.claude/skills/brain-ingest ~/.claude/skills/brain-search ~/.claude/skills/brain-refresh
rm claude-second-brain-$(node -p "require('./package.json').version").tgz

# Restore backed-up config if it existed
[ -f ~/.claude-second-brain/config.toml.bak ] && mv ~/.claude-second-brain/config.toml.bak ~/.claude-second-brain/config.toml

# Remove the parent dir only if empty
rmdir ~/.claude-second-brain/ 2>/dev/null || true

# Clean up GitHub test repos (if any were created — normally no, since non-TTY skips the prompt)
gh repo delete test-brain-a --yes 2>/dev/null || true
gh repo delete test-brain-b --yes 2>/dev/null || true
```

> **Note:** If the user had pre-existing `brain-ingest` / `brain-search` / `brain-refresh` global skills from a real vault, they were overwritten by this test. They need to re-run `npx claude-second-brain` or manually re-scaffold a brain to restore them. The config backup in Step 1 protects their brain registry but not their global skills.

## What failure means

- **`.gitignore.template` present instead of `.gitignore`** — npm stripped `.gitignore` from the tarball but the rename in `bin/create.js` didn't fire; check the `try/catch` rename block
- **Brain leaked into CWD** — `targetDir` in `main()` still uses `process.cwd()`; check `bin/create.js` uses `join(CSB_ROOT, targetName)`
- **Missing skill dirs** — template copy failed or `.claude/` hidden dir wasn't included; check `npm pack --dry-run` output
- **`npx` fails to run the bin** — shebang or `bin` field in `package.json` is wrong; check `#!/usr/bin/env node` on line 1 of `bin/create.js`
- **`__QMD_PATH__` or `__CSB_CONFIG__` still in any file** — those substitutions were removed; any hit means a template file still has a legacy placeholder that should be replaced with a relative path or CLI invocation
- **Global skills still reference `$QMD_INDEX`** — the old Brain Discovery preamble wasn't dropped; regenerate from the new `template/.claude/skills/brain-*/SKILL.md` sources
- **`.csb-version` missing** — `installGlobalSkills()` didn't write the sidecar; check the sidecar write in `bin/create.js`
- **`config.toml` missing** — `writeConfig()` not called or failed; check the call at the end of `main()`
- **`default` changed after second brain was created** — `writeConfig()` upsert logic is overwriting `default`; it should only set `default` when the config file doesn't exist yet
- **Only one `[[brains]]` entry after second scaffold** — `writeConfig()` upsert is replacing instead of appending; check the split/filter/join logic
- **`claude-second-brain path` returns wrong brain** — `parseConfig` regex failing to pick up `default = …` (or legacy `active = …`); inspect the regex
- **Note:** `pnpm dlx` cannot run local tarballs — use `npx` for this test. After publishing, `pnpm dlx claude-second-brain` from the registry works fine.
