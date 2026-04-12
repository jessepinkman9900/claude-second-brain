
# :classical_building: obsidian-agent-wiki

**Your notes don't compound. This wiki does.**

[![npm](https://img.shields.io/npm/v/obsidian-agent-wiki)](https://www.npmjs.com/package/obsidian-agent-wiki) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The fastest way to start a personal knowledge base powered by Obsidian, Claude Code, qmd, and GitHub.

You've been reading papers, articles, and books for years. Drop a source in, run `/ingest`, and Claude reads it — extracts what matters, cross-links it to everything you already know, and files it. Ask a question six months later and get cited answers, not a list of files to re-read.

```
npx obsidian-agent-wiki
```

One command gives you a fully wired knowledge system:
- [Claude](https://claude.ai/) ingests your sources and maintains a cross-linked wiki
- [qmd](https://github.com/tobi/qmd) powers local semantic search
- [Obsidian](https://obsidian.md) renders it beautifully with the [obsidian-git](https://github.com/Vinzent03/obsidian-git) community plugin pre-configured for seamless sync
- GitHub is the source of truth — version history, anywhere access, and a backup you control

> **Inspired by [Andrej Karpathy's approach to LLM-powered knowledge management](https://x.com/karpathy/status/2040470801506541998?s=20)** — share an "idea file" with an LLM agent and let it build and maintain your knowledge base.

![Obsidian graph view of a running wiki](image.png)

---


## How this is different

This is not a RAG system. It's not a chatbot over your notes. It's an actively maintained, cross-linked wiki — five structured page types, YAML frontmatter, and a set of Claude Code skills that run the whole thing.


The schema (`CLAUDE.md`) is that idea file. Claude reads it every session.

---

## The stack

| Tool | Role |
|---|---|
| **Claude Code** | Reads sources, writes wiki pages, cross-links, flags contradictions |
| **qmd** | Local hybrid search (vector + BM25) across your entire wiki |
| **Obsidian** | Graph view, backlinks, mobile reading — offline, no extra sync |
| **GitHub** | Source of truth — version history, Claude Code anywhere, Obsidian sync |

Everything is pre-configured. You bring the sources.

---

## Get started in 3 steps

**Step 1 — Scaffold**

```bash
npx obsidian-agent-wiki
```

Creates your vault, installs `mise` + `bun`, and runs `git init` with an initial commit.

**Step 2 — Initialize inside Claude Code**

```bash
cd my-wiki && claude
```

Then run:

```
/setup
```

Registers the qmd collections and generates local vector embeddings. First run downloads ~2GB of GGUF models — once.

**Step 3 — Push to GitHub and open in Obsidian**

```bash
git remote add origin https://github.com/you/my-wiki.git
git push -u origin main
```

Open `my-wiki/` as a vault in Obsidian. The Git plugin is pre-configured — enable it and sync is automatic.

---

## Claude Code skills included

The wiki ships with three slash commands that cover the full workflow. No manual prompting, no copy-pasting.

**`/ingest`** — Drop a file into `sources/articles/`, `sources/pdfs/`, or `sources/personal/`. Run `/ingest`. Claude summarizes the source, asks what matters most to you, creates a `wiki/sources/` page, updates or creates related topic pages, flags any contradictions with existing knowledge, and logs everything.

**`/query`** — Ask anything about what you know. Claude runs hybrid semantic search across the wiki, reads the most relevant pages, and writes an answer with inline `[[wiki/page]]` citations. If the answer synthesizes multiple pages in a novel way, it offers to file it as a permanent `wiki/qa/` entry.

**`/lint`** — Health-check the wiki. Surfaces orphan pages, broken links, unresolved contradictions, and data gaps. Reports findings and applies fixes where possible.

---

## Access from anywhere

**Edit anywhere — Claude Code on desktop or mobile**
Claude Code's GitHub integration lets you open the repo and work from anywhere — ingest a source, run a query, or update a page from your phone.

**Read anywhere — Obsidian desktop and mobile**
Open the repo as an Obsidian vault. The bundled `.obsidian` folder pre-configures the [obsidian-git](https://github.com/Vinzent03/obsidian-git) community plugin — no setup required, just enable it. Your wiki syncs automatically on every commit. For iOS: put the repo folder inside iCloud Drive — Obsidian Mobile picks it up natively with no extra setup. Graph view, backlinks, offline reading — all working.

**Browse anywhere — GitHub**
It's a plain GitHub repo. View and edit files directly in the browser at any time.

---

## How it works

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────────┐
│   Drop in a source  │        │  /ingest in Claude  │        │     Wiki grows      │
│                     │        │        Code         │        │                     │
│  · article          │──────▶ │                     │──────▶ │  · cross-linked     │
│  · PDF              │        │  reads + extracts   │        │    pages            │
│  · personal note    │        │  key knowledge      │        │  · contradictions   │
│                     │        │                     │        │    flagged          │
└─────────────────────┘        └─────────────────────┘        │  · syntheses        │
                                                              │    written          │
                                                              └─────────────────────┘
```

Query it anytime with `/query`. Get answers with inline `[[wiki/page]]` citations, not a list of files.

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
my-wiki/
├── CLAUDE.md              ← The schema. Claude reads this every session.
├── sources/               ← Your raw inputs. Claude never modifies these.
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

---

## Roadmap

- [ ] GitHub Actions for scheduled re-indexing
- [ ] GitHub agentic workflows — auto-ingest on push, scheduled lint, auto-summary on new sources
- [ ] More Claude Code skills (source discovery, topic clustering)

---

## Requirements

- [mise](https://mise.jdx.dev/) — auto-installed by the CLI if missing
- [Claude Code](https://claude.ai/code) — the CLI that runs the wiki
- [Obsidian](https://obsidian.md/) — optional but recommended

---

## License

MIT
