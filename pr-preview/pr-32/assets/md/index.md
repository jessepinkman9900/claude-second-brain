# Your notes don't compound. claude-second-brain turns them into a wiki that does.

Scaffold a personal knowledge base: an Obsidian vault and git repo where your AI coding agent (Claude Code, Codex, Cursor, Copilot, and more) reads your sources and maintains a cross-linked wiki with local qmd search.

```bash
npx claude-second-brain
```

[Get started](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/getting-started) · Want the details first? [How it works](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/concepts/how-it-works) · [CLI reference](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/cli) · [GitHub](https://github.com/jessepinkman9900/claude-second-brain)

One command gives you a fully wired knowledge system:

* **Your AI agent** (Claude Code, Codex, Cursor, …) ingests your sources and maintains a cross-linked wiki
* **qmd** powers local semantic search (vector + BM25)
* The scaffolded folder **is your Obsidian vault** — open it directly, with [obsidian-git](https://github.com/Vinzent03/obsidian-git) pre-configured for seamless sync
* **Git** ([GitHub](https://github.com), [Cloudflare Artifacts](https://developers.cloudflare.com/artifacts/), or any remote) is the source of truth — version history, anywhere access, and a backup you control

You've been reading papers, articles, and books for years. Drop a source in, run [`/brain-ingest`](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills/brain-ingest), and your agent reads it — extracts what matters, cross-links it to everything you already know, and files it. Ask a question six months later and get cited answers, not a list of files to re-read.

> Inspired by [Andrej Karpathy's approach to LLM-powered knowledge management](https://x.com/karpathy/status/2040470801506541998?s=20) — share an "idea file" with an LLM agent and let it build and maintain your knowledge base.

## How this is different

This is not a RAG system. It's not a chatbot over your notes. It's an actively maintained, cross-linked wiki — five structured page types, YAML frontmatter, and a set of [agent skills](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/skills) — usable from Claude Code, Codex, Cursor, Copilot, or any agent that supports [Agent Skills](https://agentskills.io) — that run the whole thing.

The schema ([CLAUDE.md](https://github.com/jessepinkman9900/claude-second-brain/blob/main/CLAUDE.md)) is that idea file. Your agent reads it every session (other agents reach it through `AGENTS.md`).

## The stack

| Tool | Role |
| --- | --- |
| **Your agent** (Claude Code, Codex, Cursor, Copilot, …) | Reads sources, writes wiki pages, cross-links, flags contradictions |
| **qmd** | Local hybrid search (vector + BM25) across your entire wiki |
| **Obsidian** | Graph view, backlinks, mobile reading — offline, no extra sync |
| **Git** (GitHub, Cloudflare Artifacts, …) | Source of truth — version history, your agent anywhere, Obsidian sync |

Everything is pre-configured. You bring the sources.

Next: [Get started in 3 steps →](https://jessepinkman9900.github.io/claude-second-brain/pr-preview/pr-32/getting-started)
