---
name: brain-search
description: "Query the wiki to answer a question. Searches semantically, synthesizes an answer with inline citations, and optionally files the answer as a permanent Q&A page. Trigger phrases: /brain-search, what do I know about, search the wiki, find everything about, what does the wiki say about."
argument-hint: "The question or topic to query (e.g. 'what do I know about transformer architecture?')"
---

# Brain Search

Runs the 4-step query workflow defined in CLAUDE.md. Answers come with inline `[[wiki/page]]` citations — not a list of files.

## Workflow

**Step 1 — Search the wiki**
- Run hybrid search: `INDEX_PATH=__QMD_PATH__ pnpm dlx @tobilu/qmd query -c wiki "<question>"`
- Read `wiki/index.md` to confirm coverage and catch any pages qmd didn't surface
- Read the 2–5 most relevant pages in full before synthesizing

**Step 2 — Synthesize an answer**
- Write the answer with inline `[[wiki/page]]` citations throughout
- Be explicit about confidence: flag gaps with "The wiki doesn't have coverage on X."
- If relevant pages are sparse, say so — don't pad with speculation

**Step 3 — Offer to file**
- If the answer draws together multiple pages in a novel way, ask:
  > "This answer synthesizes several pages in a useful way — want me to file it as a Q&A page?"
- If yes:
  - Create `wiki/qa/[slug].md` with frontmatter `type: qa`
  - Add to the Q&A section in `wiki/index.md`
  - Add `[[wiki/qa/slug]]` cross-links from the relevant topic pages

**Step 4 — Log (if significant)**
- For queries that reveal new understanding or surface a gap worth tracking, append to `wiki/log.md`:
  ```
  ## [YYYY-MM-DD] query | Brief question summary

  Filed as: [[wiki/qa/slug]] (or "not filed")
  ```
- Skip logging for routine lookups
