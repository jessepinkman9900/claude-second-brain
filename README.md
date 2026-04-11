# obsidian-agent-memory

A persistent, compounding knowledge base powered by a local LLM wiki. Sources go in, Claude reads them, extracts key knowledge, and integrates it into interlinked wiki pages — with cross-references, contradictions, and syntheses already there when you need them.

See [CLAUDE.md](./CLAUDE.md) for the full wiki schema and operating instructions.

---

## Getting Started

### 1. Install tools

```bash
mise install
```

This installs `bun` (and any other tools declared in `mise.toml`).

### 2. Open Claude CLI

```bash
claude
```

### 3. Run the setup command

```
/setup
```

This registers the qmd collections and generates vector embeddings for the vault. The first run downloads ~2GB of local GGUF models — expect it to take a few minutes.

---

## Re-indexing

After a bulk wiki ingest session, run `/setup` again (or just `bun scripts/qmd/reindex.ts`) to keep the index current.
