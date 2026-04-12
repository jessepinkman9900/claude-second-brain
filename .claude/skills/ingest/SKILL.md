---
name: ingest
description: "Ingest a new source into the wiki. Reads the source, summarizes it, creates a wiki/sources/ page, updates affected topic and entity pages, flags contradictions, and logs the activity. Trigger phrases: /ingest, ingest [file or URL], add this source, read and file this, process this article/paper/note."
argument-hint: "File path (e.g. sources/articles/my-article.md), URL, or leave blank if source is pasted in chat"
---

# Ingest

Runs the full 9-step ingest workflow defined in CLAUDE.md. Do not skip steps.

## Inputs

- **File path** — a file in `sources/articles/`, `sources/pdfs/`, or `sources/personal/`
- **URL** — fetch and read the full content directly
- **Pasted text** — treat whatever the user has shared as the source

## Workflow

**Step 1 — Read the source**
- File: use the Read tool on the provided path
- URL: fetch and read the full content
- Pasted text: treat as the source directly

**Step 2 — Discuss with the user**
- Summarize the source in 3–5 bullets
- Ask: what aspects matter most? Anything to emphasize or skip?
- Let the user's response shape which topics get deep treatment before proceeding

**Step 3 — Create source summary page**
- File: `wiki/sources/[slug].md` (slug = kebab-case from title)
- Sections: title, author/date, one-paragraph abstract, key claims (bulleted), notable quotes (max 3), synthesis note, links to wiki pages this source touches
- Frontmatter: `type: source-summary`, `tags`, `updated: YYYY-MM-DD`

**Step 4 — Update `wiki/index.md`**
- Add the new source to the Sources Ingested section: one-line description + `[[wiki/sources/slug]]` link

**Step 5 — Identify affected wiki pages**
- Run: `INDEX_PATH=qmd.sqlite bunx @tobilu/qmd query -c wiki "<source topic and key claims>"`
- Also Glob `wiki/*.md` and `wiki/sources/*.md` to catch anything qmd missed
- List all pages to create or update before proceeding

**Step 6 — Update or create wiki pages**
- For each affected page: read it, integrate the new information, add `[[wiki/sources/slug]]` to `sources` frontmatter, update `updated` date
- Create new topic/entity pages for anything that doesn't have one yet
- Write synthesis, not transcription — your own words, with source attributions
- Cross-link aggressively: any topic or entity mentioned should use `[[wiki/page]]`

**Step 7 — Flag contradictions**
- If the source contradicts anything on an existing page, add a `> [!WARNING] Contradiction` callout
- State both positions and both sources explicitly

**Step 8 — Update `wiki/overview.md`**
- Only if the source shifts the high-level synthesis or introduces a significant new theme
- Otherwise skip this step

**Step 9 — Append to log**
- Append to `wiki/log.md` (never overwrite):
  ```
  ## [YYYY-MM-DD] ingest | Source Title

  [[wiki/sources/slug]] | Pages touched: [[wiki/page1]], [[wiki/page2]], ...
  ```

## Hard Rules

- Never modify anything in `sources/` — immutable raw inputs
- Every wiki page must have frontmatter with at least `type` and `updated`
- One source summary page per source — never merge two sources into one
