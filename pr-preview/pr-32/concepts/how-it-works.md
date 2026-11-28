# How it works

Sources go in on the left, your agent synthesizes them into the wiki, qmd indexes every page into a local hybrid search index, and git makes the whole vault editable from Obsidian and your agent on any device.

Articles, PDFs, notes and your questions go in through your agent; the wiki and its qmd index sit in the middle; Claude Code, Codex, Cursor, Obsidian and git all read and edit the same vault. Your agent runs /brain-ingest on new sources and /brain-search on questions; qmd indexes every page; git keeps every device in sync.

**You bring:**

* Articles
* PDFs
* Personal notes
* Questions

**In the middle:** Your wiki (wiki/ + qmd index)

**Works with:**

* Claude Code
* Codex
* Cursor
* Obsidian
* Git remote

## The ingest loop, zoomed in

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│   Drop in a source  │        │ /brain-ingest       │        │     Wiki grows      │
│                     │        │                     │        │                     │
│  · article          │──────▶ │  reads + extracts   │──────▶ │  · cross-linked     │
│  · PDF              │        │  key knowledge      │        │  · contradictions   │
│  · personal note    │        │                     │        │    flagged          │
│                     │        │                     │        │  · syntheses        │
└─────────────────────┘        └─────────────────────┘        └─────────────────────┘
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
