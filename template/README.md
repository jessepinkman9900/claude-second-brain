# claude-second-brain

**Your notes don't compound. This wiki does.**

Drop in a source. Claude reads it, extracts what matters, cross-links it to everything you already know, and files it. Query it six months later and get cited answers — not a list of files to re-read.

Inspired by [Andrej Karpathy's approach to LLM-powered knowledge management](https://x.com/karpathy/status/2040470801506541998?s=20).

---

## Quick start

```bash
# 1. Install tools
mise install

# 2. Open Claude Code
claude
```

Inside Claude Code, run:

```
/setup
```

Registers the qmd collections and generates local vector embeddings. First run downloads ~2GB of GGUF models — once.

**Then open this folder in Obsidian.** The Git plugin is pre-configured — enable it in Obsidian settings and your wiki syncs automatically.

---

## Your Claude Code skills

**`/ingest`** — Add a file to `sources/articles/`, `sources/pdfs/`, or `sources/personal/`, then run `/ingest`. Claude summarizes the source, asks what aspects matter most, updates related wiki pages, flags contradictions, and logs everything.

**`/query`** — Ask anything: `what do I know about [topic]?` Claude searches the wiki semantically and returns a cited answer. If it synthesizes multiple pages in a useful way, it offers to file it as a permanent `wiki/qa/` entry.

**`/lint`** — Health-check the wiki. Finds orphan pages, broken links, unresolved contradictions, and data gaps. Reports findings and fixes what it can.

---

## Obsidian Mobile

If this repo lives inside your iCloud Drive folder, Obsidian Mobile reads it with no extra setup. Graph view, backlinks, offline access — all working. The Git plugin handles sync automatically when you commit and push.

---

## Wiki structure

Five page types, all with YAML frontmatter:

| Type | File | Purpose |
|---|---|---|
| `overview` | `wiki/overview.md` | Evolving high-level synthesis |
| `topic` | `wiki/[concept].md` | A concept, domain, or idea |
| `entity` | `wiki/[name].md` | A person, tool, company, or project |
| `source-summary` | `wiki/sources/[slug].md` | One page per ingested source |
| `qa` | `wiki/qa/[slug].md` | Filed answers to notable queries |

All pages cross-link with Obsidian `[[wikilinks]]`. Contradictions are flagged with `[!WARNING]` callouts. Full schema in [CLAUDE.md](./CLAUDE.md).

---

## Directory layout

```
claude-second-brain/
├── CLAUDE.md              ← The schema. Claude reads this every session.
├── sources/               ← Your raw inputs. Claude never modifies these.
│   ├── articles/          ← Web articles saved as markdown
│   ├── pdfs/              ← PDFs or extracted text
│   └── personal/          ← Brain dumps, rough notes
├── wiki/                  ← Claude owns this entirely.
│   ├── index.md           ← Master index
│   ├── log.md             ← Append-only activity log
│   ├── overview.md        ← Evolving synthesis
│   ├── sources/           ← One summary per ingested source
│   └── qa/                ← Filed Q&A answers
└── scripts/qmd/           ← Semantic search setup and re-indexing
```

---

## Re-indexing

After a bulk ingest session, re-index to keep search current:

```bash
bun scripts/qmd/reindex.ts
```

Or run `/setup` again inside Claude Code.

---

## License

MIT
