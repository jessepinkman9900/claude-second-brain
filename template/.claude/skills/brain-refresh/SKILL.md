---
name: brain-refresh
description: "Refresh the qmd index for this vault — re-scans all collections for new/changed files and regenerates vector embeddings. Use after a bulk ingest session, after manual file edits, or whenever search feels stale. Trigger phrases: /brain-refresh, refresh the brain, refresh embeddings, re-embed wiki, update qmd index, refresh search index."
argument-hint: "Optional: 'force' to force re-embedding of every chunk (slow, useful after embedding model changes)"
---

# Brain Refresh

Refreshes the qmd index so search reflects the current state of the vault. Wraps `pnpm qmd:reindex` (incremental) and the qmd CLI's force-embed flag.

## Brain Discovery

All commands target the **default brain** registered in `~/.claude-second-brain/config.toml`.
Resolve the brain root via the CLI and run qmd through the CLI proxy:

```bash
BRAIN_PATH=$(npx -y claude-second-brain path)
npx -y claude-second-brain qmd -- status
```

Pass `--brain <name>` before the `--` to target a non-default brain.

## When to Use

- After a `/brain-ingest` session (or several) — batch the refresh, don't run after every file edit
- After manual edits to `wiki/` or `raw-sources/` files
- When `/brain-search` results feel stale or miss recently added content
- After upgrading `@tobilu/qmd` or changing the embedding model — use `force` mode

## Procedure

All `pnpm qmd:*` commands must run from `$BRAIN_PATH`; the CLI proxy (`claude-second-brain qmd`) works from anywhere.

### Default — Incremental Refresh

Run:
```bash
cd "$BRAIN_PATH" && pnpm qmd:reindex
```

This script does two things:
1. **Update** — scans collections for new, changed, or deleted files and updates the index
2. **Embed** — generates vector embeddings for any chunks that need them

Only chunks that changed get re-embedded, so this is fast on subsequent runs.

### Force Mode (`force` argument)

When the user passes `force`, re-embed **every** chunk — not just the changed ones. Use after embedding-model changes or if embeddings appear corrupted.

```bash
# Step 1 — update the file index first
cd "$BRAIN_PATH" && pnpm qmd:reindex

# Step 2 — force re-embed everything
npx -y claude-second-brain qmd -- embed -f
```

Force mode is slow — confirm with the user before proceeding if the wiki is large.

## Verify

After refresh, confirm with:

```bash
npx -y claude-second-brain qmd -- status
```

Document and embedding counts should be non-zero and reflect recent activity. If embeddings show as `0` or far below document count, re-run the refresh.

## Notes

- First run downloads ~2GB of GGUF models — expected, one-time
- Do not run this after every single file edit — batch it after a session
- This skill does **not** change the qmd schema (collections, contexts). For that, use `/brain-rebuild`
