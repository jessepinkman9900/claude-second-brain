---
name: brain-search
description: "Query the wiki to answer a question. Searches semantically, synthesizes an answer with inline citations, and optionally files the answer as a permanent Q&A page. Trigger phrases: /brain-search, what do I know about, search the wiki, find everything about, what does the wiki say about."
argument-hint: "The question or topic to query (e.g. 'what do I know about transformer architecture?')"
---

# Brain Search

Runs the 4-step query workflow defined in CLAUDE.md. Answers come with inline `[[wiki/page]]` citations — not a list of files.

## Brain Discovery

All commands target the **default brain** registered in `~/.claude-second-brain/config.toml`.
Resolve paths and run qmd via the `claude-second-brain` CLI — do not bake paths into this file:

```bash
BRAIN_PATH=$(npx -y claude-second-brain path)       # absolute path to the default brain's directory
npx -y claude-second-brain qmd -- query -c wiki "<question>"
```

Pass `--brain <name>` before the `--` to target a non-default brain.

## Workflow

**Step 1 — Search the wiki**
- Run hybrid search: `npx -y claude-second-brain qmd -- query -c wiki "<question>"`
- Read `$BRAIN_PATH/wiki/index.md` to confirm coverage and catch any pages qmd didn't surface
- Read the 2–5 most relevant pages in full before synthesizing (paths relative to `$BRAIN_PATH`)

**Step 2 — Synthesize an answer**
- Write the answer with inline `[[wiki/page]]` citations throughout
- Be explicit about confidence: flag gaps with "The wiki doesn't have coverage on X."
- If relevant pages are sparse, say so — don't pad with speculation

**Step 3 — Offer to file**
- If the answer draws together multiple pages in a novel way, ask:
  > "This answer synthesizes several pages in a useful way — want me to file it as a Q&A page?"
- If yes:
  - Create `$BRAIN_PATH/wiki/qa/[slug].md` with frontmatter `type: qa`
  - Add to the Q&A section in `wiki/index.md`
  - Add `[[wiki/qa/slug]]` cross-links from the relevant topic pages

**Step 4 — Log (if significant)**
- For queries that reveal new understanding or surface a gap worth tracking, append to `$BRAIN_PATH/wiki/log.md`:
  ```
  ## [YYYY-MM-DD] query | Brief question summary

  Filed as: [[wiki/qa/slug]] (or "not filed")
  ```
- Skip logging for routine lookups
