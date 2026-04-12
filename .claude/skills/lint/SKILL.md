---
name: lint
description: "Health-check the wiki. Finds orphan pages, unresolved contradictions, stale claims, missing pages, broken links, and data gaps. Produces a lint report and appends to the log. Trigger phrases: /lint, health check the wiki, audit the wiki, check for broken links, wiki maintenance."
argument-hint: "Optional: focus area (e.g. 'broken links only', 'check contradictions'). Leave blank for a full check."
---

# Lint

Runs the full lint workflow defined in CLAUDE.md. Checks for six categories of issues, fixes what can be fixed automatically, and reports the rest.

## Workflow

Run all six checks. For each: identify issues, apply fixes where possible, and note anything that needs user input.

**Check 1 — Orphan pages**
- Find wiki pages with no inbound `[[links]]` from any other wiki page
- Glob `wiki/*.md`, read each, check whether any other page links to it
- Fix: add links from relevant topic pages where appropriate
- If a page is a stub with no clear home, flag it for the user to decide

**Check 2 — Unresolved contradictions**
- Grep `wiki/` for `[!WARNING] Contradiction` callouts
- Report each one: which pages, what the conflict is, which sources are involved
- Fix: flag to user with a recommendation — a new source may resolve it

**Check 3 — Stale claims**
- Look for claims on older pages that newer source-summary pages have superseded
- Cross-reference `updated` dates in frontmatter against source dates
- Fix: update the claim and update the `sources` frontmatter attribution

**Check 4 — Missing pages**
- Find `[[wikilinks]]` that appear frequently across wiki pages but have no corresponding file
- Glob `wiki/*.md`, extract all `[[...]]` links, check each against the file system
- Fix: create stub pages for high-frequency missing links and queue them for ingestion

**Check 5 — Broken links**
- Find `[[wikilinks]]` pointing to files that don't exist
- Fix: create the missing page as a stub, or correct the link if it's a typo

**Check 6 — Data gaps**
- Identify important topics in the wiki that have many cross-references but thin source coverage
- Look for topic pages with empty or sparse `sources` frontmatter
- Report: suggest specific sources, articles, or web searches to fill each gap

## Output

Produce a lint report with three sections:
1. **Issues found** — count and description per category
2. **Fixes applied** — what was changed automatically
3. **Next sources to investigate** — recommended reads to address data gaps or resolve contradictions

Then append to `wiki/log.md` (never overwrite):
```
## [YYYY-MM-DD] lint | Lint run

N issues found, N fixed. [Brief summary of notable findings.]
```
