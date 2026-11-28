# How it works

Sources go in on the left, your agent synthesizes them into the wiki, qmd indexes every page into a local hybrid search index, and git makes the whole vault editable from Obsidian and your agent on any device.

Articles, PDFs and notes go in, alongside your Obsidian vault and git remote; your brain (the wiki plus its qmd index) sits in the middle; Claude Code, Codex, Cursor, GitHub Copilot and Gemini all read and maintain it. Set it up once. Every agent you use reads the same wiki, ingests new sources with /brain-ingest and answers with /brain-search.

**Your sources:**

* Articles
* PDFs
* Notes
* Obsidian
* Git

**In the middle:** Your brain (wiki + qmd)

**Your agents:**

* Claude Code
* Codex
* Cursor
* Copilot
* Gemini

## The ingest loop, zoomed in

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Drop in a source │    │ /brain-ingest    │    │ Wiki grows       │
│                  │    │                  │    │                  │
│ · article        │───▶│ reads + extracts │───▶│ · cross-linked   │
│ · PDF            │    │ key knowledge    │    │ · contradictions │
│ · personal note  │    │                  │    │   flagged        │
│                  │    │                  │    │ · syntheses      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

Query it anytime with `/brain-search`. Get answers with inline `[[wiki/page]]` citations, not a list of files.

## Directory layout

```
my-brain/
├── CLAUDE.md              ← The schema. Your agent reads this every session.
├── raw-sources/           ← Your raw inputs. The agent never modifies these.
│   ├── articles/
│   ├── pdfs/
│   └── personal/
├── wiki/                  ← The agent owns this entirely.
│   ├── index.md
│   ├── log.md
│   ├── overview.md
│   ├── sources/
│   └── qa/
└── scripts/qmd/           ← Semantic search setup and re-indexing
```
