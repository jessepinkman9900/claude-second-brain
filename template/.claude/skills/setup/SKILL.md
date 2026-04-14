---
name: setup
description: "Initialize this obsidian-agent-memory vault. Registers qmd collections and generates vector embeddings. Use when: setting up for the first time, re-registering collections, or re-indexing after a bulk ingest session. Trigger phrases: /setup, setup vault, initialize collections, reindex, register qmd."
argument-hint: "Optional: 'reindex' to skip registration and only re-index files"
---

# Vault Setup

## When to Use
- First-time setup after cloning
- Re-registering qmd collections (e.g., after config changes)
- Re-indexing after a bulk wiki ingest session (run step 2 only)

## Procedure

All commands run from the vault root.

### Full Setup (first time)

**Step 1 — Register collections and contexts**

Run:
```bash
bun scripts/qmd/setup.ts
```

Registers the four qmd collections (`wiki`, `raw-sources`, `human`, `daily-notes`) and their path-level context descriptions. Idempotent — safe to re-run.

**Step 2 — Index files and generate embeddings**

Run:
```bash
bun scripts/qmd/reindex.ts
```

Scans all collections for new/changed files and generates vector embeddings. The first run downloads ~2GB of local GGUF models — this will take a while.

### Re-index Only (after bulk ingest)

Skip step 1 and run only:
```bash
bun scripts/qmd/reindex.ts
```

Do **not** re-run after every single file edit — batch it after a session.

### Step 3 — Verify installation

Run these three commands to confirm everything is working:

```bash
# List registered collections (expect: wiki, raw-sources, human, daily-notes)
INDEX_PATH=__QMD_PATH__ bunx @tobilu/qmd collection list

# List registered contexts
INDEX_PATH=__QMD_PATH__ bunx @tobilu/qmd context list

# Show index status and embedding counts
INDEX_PATH=__QMD_PATH__ bunx @tobilu/qmd status
```

All four collections should appear in `collection list`. `status` should show non-zero document and embedding counts — if embeddings are 0, re-run step 2.

## Notes
- `bun` is managed via `mise` — ensure `mise install` has been run before setup
- If `bunx @tobilu/qmd` commands fail after setup, re-run step 1 then step 2
