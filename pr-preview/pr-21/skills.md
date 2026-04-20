## Skills

The wiki ships with a set of Claude Code slash commands that cover the full workflow. No manual prompting, no copy-pasting.

### Daily workflow

* [**`/brain-ingest`**](/skills/brain-ingest) — Drop a file into `raw-sources/`. Claude summarizes the source, creates a `wiki/sources/` page, updates related topic pages, and flags contradictions.
* [**`/brain-search`**](/skills/brain-search) — Ask anything. Claude runs hybrid search, reads the most relevant pages, and writes an answer with inline `[[wiki/page]]` citations.
* [**`/lint`**](/skills/lint) — Health-check the wiki. Surfaces orphan pages, broken links, unresolved contradictions, and data gaps.

### Maintenance

* [**`/brain-refresh`**](/skills/brain-refresh) — Re-scan the vault and regenerate vector embeddings for new or changed files.
* [**`/brain-rebuild`**](/skills/brain-rebuild) — **Destructive.** Redesigns the qmd schema, drops the old index, and rebuilds from scratch. Use only when the current structure no longer fits how you search.

### Install or update skills

`/brain-ingest`, `/brain-search`, and `/brain-refresh` install globally to `~/.claude/skills/` during setup so they work in any Claude Code session. `/brain-rebuild` and `/lint` live inside the vault at `.claude/skills/`.

To pull in improvements from the latest template:

```bash
# Install or update all 5 wiki skills
npx skills add https://github.com/jessepinkman9900/claude-second-brain/tree/main/template/.claude/skills -a claude-code -y

# Or update a specific skill
npx skills add https://github.com/jessepinkman9900/claude-second-brain/tree/main/template/.claude/skills --skill brain-ingest -a claude-code -y
```

Once installed via `npx skills`, future updates are a single command:

```bash
npx skills update -a claude-code
```
