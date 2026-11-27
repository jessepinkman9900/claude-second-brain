## How it works

Sources flow in on the left, Claude synthesizes them into the wiki, qmd indexes every page into a local hybrid search index, and GitHub makes the whole vault editable from Obsidian and Claude Code on any device.

```mermaid
flowchart TB
  subgraph Sources["raw-sources/ — raw, immutable"]
    direction LR
    S1[articles/]
    S2[pdfs/]
    S3[personal/]
  end

  subgraph Skills["Claude Code skills"]
    direction LR
    I["/brain-ingest"]
    Q["/brain-search"]
    R["/brain-refresh"]
  end

  subgraph Wiki["wiki/ — cross-linked synthesis"]
    direction LR
    W1[overview.md]
    W2[topic / entity pages]
    W3[sources/]
    W4[qa/]
  end

  QMD[("qmd.sqlite<br/>vector + BM25<br/>hybrid index")]

  subgraph Remote["GitHub — source of truth"]
    GH[private repo]
  end

  subgraph Read["Read / edit anywhere"]
    direction LR
    OB["Obsidian<br/>graph · backlinks · mobile"]
    CC["Claude Code<br/>desktop + mobile"]
  end

  User((you))

  Sources -->|read| I
  I -->|write pages, cross-link,<br/>flag contradictions| Wiki
  R -.->|chunk + embed<br/>changed files| QMD
  Wiki -.->|indexed by| QMD
  User -->|ask a question| Q
  Q -->|hybrid search| QMD
  QMD -->|top-k pages| Q
  Q -->|cited answer| User
  Wiki <-->|"obsidian-git<br/>auto commit / pull"| GH
  GH --> OB
  GH --> CC
```

### The ingest loop, zoomed in

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

### Directory layout

```
my-brain/
├── CLAUDE.md              ← The schema. Claude reads this every session.
├── raw-sources/           ← Your raw inputs. Claude never modifies these.
│   ├── articles/
│   ├── pdfs/
│   └── personal/
├── wiki/                  ← Claude owns this entirely.
│   ├── index.md
│   ├── log.md
│   ├── overview.md
│   ├── sources/
│   └── qa/
└── scripts/qmd/           ← Semantic search setup and re-indexing
```
