---
name: setup
description: "Initialize this claude-second-brain vault. Registers qmd collections and generates vector embeddings. Use when: setting up for the first time, re-registering collections, or re-indexing after a bulk ingest session. Trigger phrases: /setup, setup vault, initialize collections, reindex, register qmd."
argument-hint: "Optional: 'reindex' to skip registration and only re-index files"
---

# Vault Setup

## When to Use
- First-time indexing (collections are already registered by `npx claude-second-brain`)
- Re-registering qmd collections after manual config changes
- Re-indexing after a bulk wiki ingest session (run step 2 only)

## Procedure

All commands run from the vault root.

### Full Setup (first time)

**Step 1 — Register collections and contexts** *(already done by the scaffold — re-run only if needed)*

Run:
```bash
pnpm qmd:setup
```

Registers the two core qmd collections (`wiki`, `raw-sources`) and their path-level context descriptions. Idempotent — safe to re-run. `npx claude-second-brain` runs this automatically after `pnpm install`, so a fresh vault already has collections registered.

**Step 2 — Index files and generate embeddings**

Run:
```bash
pnpm qmd:reindex
```

Scans all collections for new/changed files and generates vector embeddings. The first run downloads ~2GB of local GGUF models — this will take a while.

### Re-index Only (after bulk ingest)

Skip step 1 and run only:
```bash
pnpm qmd:reindex
```

Do **not** re-run after every single file edit — batch it after a session.

### Step 3 — Verify installation

Run these three commands to confirm everything is working:

Run from the vault root so the relative `.qmd/index.sqlite` path resolves correctly:

```bash
# List registered collections (expect: wiki, raw-sources)
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd collection list

# List registered contexts
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd context list

# Show index status and embedding counts
INDEX_PATH=.qmd/index.sqlite pnpm dlx @tobilu/qmd status
```

Both collections should appear in `collection list`. `status` should show non-zero document and embedding counts — if embeddings are 0, re-run step 2.

## Notes
- `node` and `pnpm` are managed via `mise` — ensure `mise install` and `pnpm install` have been run before setup
- If `pnpm dlx @tobilu/qmd` commands fail after setup, re-run step 1 then step 2
