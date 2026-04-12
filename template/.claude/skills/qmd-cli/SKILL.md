---
name: qmd-cli
description: 'Use qmd CLI to manage collections, index documents, search, and query a local semantic knowledge base. Use when the user mentions qmd, searching a collection, indexing files, running queries, hybrid search, BM25, vector search, or managing a document index. Covers: collection add/list/remove/rename, context management, get/multi-get, update, embed, query, search, vsearch, and MCP server commands.'
argument-hint: 'qmd command to run or describe what you want to do (e.g., "query wiki for X", "add folder to collection")'
---

# qmd CLI

Local semantic document index with hybrid search (BM25 + vector), collection management, and MCP server.

## Vault DB

This vault keeps its index at `qmd.sqlite` in the vault root (gitignored). All CLI commands **must** prefix with `INDEX_PATH=qmd.sqlite` (relative path works when running from the vault root, which is always the case here):

```bash
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd query -c wiki "..."
```

The scripts `bun scripts/qmd/setup.ts` and `bun scripts/qmd/reindex.ts` write to this same file. The CLI must match.

---

## Collection Management

```bash
# Create/index a collection
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd collection add <path> --name <name> --mask <glob-pattern>
# e.g.:
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd collection add wiki --name wiki --mask "**/*.md"

# List all collections with details
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd collection list

# Remove a collection
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd collection remove <name>

# Rename a collection
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd collection rename <old-name> <new-name>
```

## Listing Files

```bash
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd ls
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd ls [collection[/path]]
```

## Context

```bash
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd context add [path] "description text"
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd context list
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd context rm <path>
```

## Retrieving Documents

```bash
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd get <file>[:line] [-l N] [--from N]
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd multi-get <pattern> [-l N] [--max-bytes N]
```

**Multi-get format flags:** `--json`, `--csv`, `--md`, `--xml`, `--files`

## Indexing & Maintenance

```bash
# Show index status and collections
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd status

# Re-index all collections
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd update [--pull]

# Create vector embeddings (900 tokens/chunk, 15% overlap)
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd embed [-f]

# Remove cache and orphaned data, vacuum DB
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd cleanup
```

> After bulk ingest sessions, run `update` then `embed` to keep the index fresh.

## Search & Query

| Command | Description |
|---------|-------------|
| `qmd query <query>` | **Recommended** — hybrid search with query expansion + reranking |
| `qmd search <query>` | Full-text keyword search (BM25, no LLM) |
| `qmd vsearch <query>` | Pure vector/semantic similarity search |

### Search Options

```
-n <num>               Number of results (default: 5, or 20 for --files)
--all                  Return all matches (use with --min-score to filter)
--min-score <num>      Minimum similarity score
--full                 Output full document instead of snippet
--line-numbers         Add line numbers to output
--files                Output docid,score,filepath,context
--json                 JSON output with snippets
--csv                  CSV output
--md                   Markdown output
--xml                  XML output
-c, --collection <name>  Filter results to a specific collection
```

### Examples

```bash
# Hybrid search across all collections
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd query "distributed systems consensus"

# Search only the wiki collection, JSON output
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd query -c wiki "transformer architecture" --json

# Keyword-only search, top 10, markdown output
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd search -c wiki "kafka" -n 10 --md

# Vector search with full documents
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd vsearch "attention mechanism" --full

# Filter by score threshold
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd query "machine learning" --all --min-score 0.7
```

## MCP Server

```bash
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd mcp
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd mcp --http [--port N]
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd mcp --http --daemon
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd mcp stop
```

## Global Options

```
--index <name>    Use a custom index name (default: index)
```

Note: use `INDEX_PATH` env var rather than `--index` — `INDEX_PATH` accepts a file path while `--index` only accepts a short name mapped to `~/.cache/qmd/`.

## Typical Workflows

### First-time setup for this vault
```bash
# Handled by the /setup skill:
bun scripts/qmd/setup.ts
bun scripts/qmd/reindex.ts
```

### After a bulk ingest session
```bash
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd update
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd embed
```

### Research workflow
```bash
# Discover relevant pages
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd query -c wiki "<topic>"

# Get a specific file
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd get wiki/distributed-systems.md

# Get multiple related files
INDEX_PATH=qmd.sqlite bunx @tobilu/qmd multi-get "wiki/kafka.md,wiki/distributed-systems.md" --md
```
