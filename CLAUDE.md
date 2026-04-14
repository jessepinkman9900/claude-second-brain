# LLM Wiki — Schema & Operating Instructions

This file governs how Claude Code maintains the personal knowledge wiki in this vault. Read it at the start of every session before doing any wiki work.

---

## What This Wiki Is

This is a **persistent, compounding knowledge base** — not a RAG index. When you add a source, Claude reads it, extracts key knowledge, and integrates it into interlinked wiki pages. The wiki accumulates understanding over time; cross-references, contradictions, and syntheses are already there when you need them.

You (the human) are responsible for: sourcing material, exploration, and asking the right questions.
Claude is responsible for: summarizing, cross-referencing, filing, and maintaining the wiki.

---

## Directory Layout

```
claude-second-brain/
├── CLAUDE.md              ← This file. The schema.
├── raw-sources/           ← Raw source material. IMMUTABLE — Claude never modifies these.
│   ├── articles/          ← Web articles saved as markdown
│   ├── pdfs/              ← PDF files or extracted text
│   └── personal/          ← Personal notes flagged for ingestion
├── wiki/                  ← LLM-maintained knowledge base. Claude owns this entirely.
│   ├── index.md           ← Master index of all wiki pages
│   ├── log.md             ← Running log of all wiki activity
│   ├── overview.md        ← Evolving high-level synthesis
│   ├── sources/           ← One summary page per ingested source
│   ├── qa/                ← Filed answers to notable queries
│   └── [topic/entity pages at root of wiki/]
└── [existing vault files] ← Daily notes, misc, ideas, etc. Claude never touches these.
```

---

## Page Types

### `overview` — `wiki/overview.md`
The single evolving synthesis page. Updated when a new source meaningfully shifts the overall picture. Structured as a narrative with cross-links, not a list.

### `topic` — `wiki/[kebab-name].md`
Notes on a concept, technology, domain, or idea. Examples: `wiki/distributed-systems.md`, `wiki/machine-learning-ops.md`, `wiki/investing-frameworks.md`.

### `entity` — `wiki/[name].md`
Notes on a specific person, company, tool, project, or place. Examples: `wiki/anthropic.md`, `wiki/kafka.md`, `wiki/ray-dalio.md`.

### `source-summary` — `wiki/sources/[slug].md`
Summary of one ingested source. Slug is kebab-case derived from the title. One page per source.

### `qa` — `wiki/qa/[slug].md`
A filed answer to a notable query. Created when an answer synthesizes multiple pages in a way worth preserving.

### `admin` — `wiki/index.md`, `wiki/log.md`
Special system/administrative pages. Not synthesis content. There are exactly two: `index.md` (master index) and `log.md` (activity log).

---

## Frontmatter Format

All wiki pages use this YAML frontmatter:

```yaml
---
type: overview | topic | entity | source-summary | qa | admin
tags: [tag1, tag2]
sources: ["[[wiki/sources/source-slug]]"]
related: ["[[wiki/related-page]]"]
updated: YYYY-MM-DD
---
```

- `type`: Required. One of the six page types above.
- `tags`: Optional. Lowercase, hyphenated. Topics for the Obsidian tag pane.
- `sources`: Links to the `wiki/sources/` pages that informed this page.
- `related`: Links to other wiki pages directly relevant to this one.
- `updated`: Date this page was last meaningfully revised.

---

## Naming Conventions

- **File names**: kebab-case, all lowercase. `machine-learning-ops.md`, not `MachineLearningOps.md`.
- **Links**: Always use Obsidian `[[wikilinks]]` — never bare URLs or markdown `[text](path)` links for internal cross-references.
- **Link format**: Use the full path from vault root: `[[wiki/distributed-systems]]`, `[[wiki/sources/attention-is-all-you-need]]`.
- **Section headings**: Use `##` for top-level sections within a page, `###` for subsections.
- **Contradictions**: Mark with `> [!WARNING] Contradiction` callout. Explain both claims and their sources.
- **Uncertainty**: Mark claims you're unsure about with `[?]` inline.

---

## Ingest Workflow

Run this workflow whenever the user adds a new source. Do not skip steps.

**Step 1 — Read the source**
- If URL: fetch and read the full content.
- If file in `raw-sources/`: read it with the Read tool.
- If pasted text: treat as the source.

**Step 2 — Discuss with the user**
- Summarize the source in 3-5 bullets.
- Ask: what aspects matter most? Anything to emphasize or skip?
- Let the user's response shape which topics get deep treatment.

**Step 3 — Create source summary page**
- File: `wiki/sources/[slug].md`
- Sections: title, author/date, one-paragraph abstract, key claims (bulleted), notable quotes (max 3), your synthesis note, links to wiki pages this source touches.

**Step 4 — Update `wiki/index.md`**
- Add the new source to the Sources section with a one-line description and link.

**Step 5 — Identify affected wiki pages**
- Run `INDEX_PATH=qmd.sqlite pnpm dlx @tobilu/qmd query -c wiki "<source topic and key claims>"` to surface related existing wiki pages.
- Also Glob `wiki/*.md` and `wiki/sources/*.md` to ensure completeness.
- List all pages to create or update.

**Step 6 — Update or create wiki pages**
- For each affected page: open it, integrate the new information, add `[[wiki/sources/slug]]` to the `sources` frontmatter, update `updated` date.
- Create new pages for topics/entities that don't have one yet.
- Keep each page a synthesis, not a copy of the source. Write in your own words with source attributions.

**Step 7 — Flag contradictions**
- If the new source contradicts anything on an existing wiki page, mark it with the `[!WARNING] Contradiction` callout on the affected page. State both positions and both sources.

**Step 8 — Update `wiki/overview.md`**
- Only if the source shifts the high-level synthesis or introduces a significant new theme.
- Otherwise skip.

**Step 9 — Append to log**
- Append an entry to `wiki/log.md` using this format:
  ```
  ## [YYYY-MM-DD] ingest | Source Title

  [[wiki/sources/slug]] | Pages touched: [[wiki/page1]], [[wiki/page2]], ...
  ```

---

## Query Workflow

Run this workflow when the user asks a question against the wiki.

**Step 1 — Search the wiki**
- Run `INDEX_PATH=qmd.sqlite pnpm dlx @tobilu/qmd query -c wiki "<question>"` to surface semantically relevant pages.
- Read `wiki/index.md` to confirm coverage and catch any pages qmd didn't surface.
- Read the 2-5 most relevant pages fully.

**Step 2 — Synthesize an answer**
- Write the answer with inline `[[wiki/page]]` citations.
- Be clear about confidence level. Flag gaps with "The wiki doesn't have coverage on X."

**Step 3 — Offer to file**
- If the answer draws together multiple pages in a novel way, ask: "This answer synthesizes several pages in a useful way — want me to file it as a Q&A page?"
- If yes: create `wiki/qa/[slug].md`, add to `wiki/index.md` Q&A section, and cross-link from the relevant topic pages.

**Step 4 — Log (optional)**
- For significant queries that reveal new understanding, append to `wiki/log.md`:
  ```
  ## [YYYY-MM-DD] query | Brief question summary

  Filed as: [[wiki/qa/slug]] (or "not filed")
  ```

---

## Lint Workflow

Run this workflow periodically or when the user asks to "health-check the wiki."

Check for each of the following and report findings:

1. **Orphan pages** — wiki pages with no inbound `[[links]]` from other wiki pages.
   - Fix: add links from relevant topic pages, or note they may be stubs to delete.

2. **Unresolved contradictions** — pages with `[!WARNING] Contradiction` callouts that haven't been resolved.
   - Fix: flag to user; determine if new sources could resolve them.

3. **Stale claims** — claims on older pages that newer sources have superseded.
   - Fix: update the claim, update the source attribution.

4. **Missing pages** — concepts or entities mentioned frequently (via `[[links]]`) that lack their own page.
   - Fix: create stub pages and queue for future ingestion.

5. **Broken links** — `[[wikilinks]]` pointing to files that don't exist.
   - Fix: create the missing page or correct the link.

6. **Data gaps** — important topics in the wiki that lack source coverage.
   - Report: suggest specific sources or web searches to fill the gap.

After checking, produce a lint report with: issues found, fixes applied, and a "next sources to investigate" list. Append to `wiki/log.md`:
```
## [YYYY-MM-DD] lint | Lint run

N issues found, N fixed. [Brief summary of notable findings.]
```

---

## Hard Rules

1. **Never modify anything in `raw-sources/`**. These are immutable raw inputs.
2. **Never touch existing vault files** (daily-notes, misc, ideas, root-level .md files, .obsidian/). The wiki lives only in `wiki/`.
3. **Always append to `wiki/log.md`** — never overwrite it.
4. **One source summary per ingested source** in `wiki/sources/`. Never merge two sources into one summary page.
5. **Every wiki page must have frontmatter** with at least `type` and `updated`.
6. **Cross-link aggressively** — if you mention a topic or entity that has (or should have) a wiki page, link it with `[[wiki/page]]`.
7. **Write synthesis, not transcription**. Wiki pages should reflect integrated understanding, not copied excerpts.

---

## Search Tool

This vault uses **qmd** (`pnpm dlx @tobilu/qmd`) for local semantic and full-text search.
Collections and contexts are registered via `pnpm qmd:setup` and stored in `qmd.sqlite` at the vault root (gitignored).

Key commands:

| Command | Use |
|---------|-----|
| `INDEX_PATH=qmd.sqlite pnpm dlx @tobilu/qmd query -c wiki "<question>"` | Hybrid search — best for topic discovery |
| `INDEX_PATH=qmd.sqlite pnpm dlx @tobilu/qmd search -c wiki "<terms>"` | Fast keyword search (BM25, no LLM) |
| `INDEX_PATH=qmd.sqlite pnpm dlx @tobilu/qmd vsearch -c wiki "<question>"` | Pure vector/semantic search |

Add `--json` for structured output. Omit `-c wiki` to search all collections (wiki, raw-sources, human, daily-notes).

**Re-indexing:** After a bulk ingest session run:
```bash
pnpm qmd:reindex
```
Do NOT re-index after every single file edit.

---

## Repo Maintenance (dev-only, not shipped to user vaults)

This section applies only when working on the `claude-second-brain` repo itself — it is not part of the template copied into user vaults.

Whenever you **add, remove, or rename a skill** under `template/.claude/skills/`, you MUST update the following in the same change:

1. **`README.md`** (root) — the "Claude Code skills included" section and the "Installing and updating skills" block. Bump the skill count ("N wiki skills") in the install commands.
2. **`template/README.md`** — the "Your Claude Code skills" section and the "Installing and updating skills" block. Bump the skill count.
3. **`bin/create.js`** — the skill-name array inside `installGlobalSkills()` if the skill should be installed globally (`~/.claude/skills/`). `brain-ingest`, `brain-search`, `brain-refresh` are global today; `brain-rebuild`, `lint`, `setup`, `qmd-cli` are vault-local.
4. **`.github/workflows/pack-test.yml`** — add a `check` line for the new vault-local skill directory, and if the skill is global, add a `check` line for `$HOME/.claude/skills/<name>/SKILL.md` plus a `grep_check` for `INDEX_PATH=/`.
5. **`.claude/skills/pack-test/SKILL.md`** — update the expected-skills comment, the `ls` and `grep` commands in Step 3, the checklist table (including the "N subdirs" count), and the cleanup / overwrite-warning note in Step 4.

Whenever you **change a qmd collection name, context path, or CLI invocation** in `scripts/qmd/setup.ts` or in skill workflows, you MUST also update every `-c <collection>` reference in `template/CLAUDE.md`, all `SKILL.md` files under `template/.claude/skills/`, and both READMEs.

Whenever you **add, remove, or rename a skill, or change the wiki schema, page types, or frontmatter format**, you MUST also update the corresponding page under `docs/pages/` — skill pages at `docs/pages/skills/`, schema summary at `docs/pages/concepts/schema.mdx`, and the sidebar in `vocs.config.ts` if page paths change. The docs site is built from `docs/` and deployed to GitHub Pages on merge to `main`.

Use `__QMD_PATH__` as the placeholder in any template file that references the qmd index path — `bin/create.js::patchVault()` substitutes it at scaffold time.
